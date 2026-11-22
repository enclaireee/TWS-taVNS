"""App/dashboard API: live telemetry over WebSocket, history + control over REST. Runs a simulated earbud.
The app link is optional: the pipeline keeps running (and stays safe) with no client connected."""
from __future__ import annotations
import asyncio, dataclasses, re
from fastapi import Depends, FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from tws.sim.earbud import DT, Scenario, Sim, run
from tws.sim.scenarios import SCENARIOS

app = FastAPI(title="TWS-taVNS core")
# ponytail: local demo hardening. Real deployment needs per-device auth (token/pairing) on every control endpoint.
LOCAL = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"
app.add_middleware(CORSMiddleware, allow_origin_regex=LOCAL, allow_methods=["GET", "POST"],
                   allow_headers=["x-tws-client"])


def need_client_header(request: Request):
    """Custom header forces a CORS preflight, so other websites cannot fire these POSTs."""
    if request.headers.get("x-tws-client") != "1":
        raise HTTPException(403, "missing X-TWS-Client header")


S = {
    "sim": None,
    "name": None,
    "speed": 2.0,
    "live": True,
    "hr_drop": None,      # (t0, t1) window for live HR drop injection
    "clients": set(),
}


def _in(t: float, w: tuple[float, float] | None) -> bool:
    return w is not None and w[0] <= t < w[1]


def _live_hr(t: float) -> float:
    if _in(t, S["hr_drop"]):
        return 36.0
    # Piecewise-constant 72 bpm keeps sin(2*pi*hr/60*t) phase-continuous at any elapsed t
    return 72.0


def load(name: str):
    S["live"] = False
    S["hr_drop"] = None
    S["sim"], S["name"] = Sim(SCENARIOS[name][1]), name


def load_live(speed: float = 2.0):
    """Start a continuous, pre-warmed live human earbud stream ready for interactive event triggers."""
    S["live"] = True
    S["hr_drop"] = None
    S["speed"] = min(max(speed, 1.0), 25.0)
    scn = Scenario("live_human", duration=1e9, hr=_live_hr)
    sim = Sim(scn, seed=7)
    # Pre-warm 60 s so HR baseline & detector are immediately calibrated on frame 1
    for _ in range(int(60.0 / DT)):
        sim.step()
    sim.pl.fsm.events.clear()
    sim.pl.events.clear()
    S["sim"], S["name"] = sim, "live_human"


def _ev(e):
    return {"t": round(e.t, 2), "kind": e.kind, "detail": e.detail}


def _active_injections(sim: Sim) -> list[str]:
    if not S["live"]:
        return []
    t, s = sim.t, sim.s
    out = []
    if _in(t, s.seizure):
        out.append("seizure")
    if _in(t, S["hr_drop"]):
        out.append("hr_drop")
    if s.fall_at is not None and s.fall_at - 1.0 <= t < s.fall_at + 12.0:
        out.append("fall")
    if _in(t, s.chewing):
        out.append("chewing")
    if _in(t, s.electrode_off):
        out.append("electrode_off")
    if _in(t, s.drop_window):
        out.append("drop_link")
    return out


def snapshot():
    sim = S["sim"]
    pl = sim.pl
    d = pl.telemetry()
    ppg = [round(float(v), 3) for v in pl._ppg[0][-48:]] if (pl._ppg is not None and pl.link_ok) else []
    eeg = [round(float(v), 1) for v in pl._eeg[0][-192::4]] if (pl._eeg is not None and pl.link_ok) else []
    imu_g = round(float(pl._imu[0][-1]), 2) if (pl._imu is not None and pl.link_ok) else None
    imp = round(float(sum(pl._imp) / len(pl._imp)), 1) if pl._imp else None

    d.update(
        scenario=S["name"],
        done=sim.done,
        speed=S["speed"],
        live_mode=bool(S["live"]),
        injections=_active_injections(sim),
        ppg=ppg,
        eeg=eeg,
        imu_g=imu_g,
        impedance_kohm=imp,
        stim=dataclasses.asdict(sim.stim.active) if sim.stim.active else None,
    )
    return d


async def send(ws, msg):
    try:
        await asyncio.wait_for(ws.send_json(msg), 0.2)   # a stalled app never blocks the control loop
    except Exception:
        S["clients"].discard(ws)


async def loop():
    while True:
        sim = S["sim"]
        if sim and not sim.done:
            try:
                sim.step()
            except Exception as e:   # fail safe: stop output, lock for review, keep serving
                for a in sim.pl.fsm.abort(sim.pl.now, f"internal error: {type(e).__name__}"):
                    sim.stim.abort(a, sim.pl.now)
                sim.stim.active = None
                sim.t = sim.s.duration
            msg = snapshot()
            await asyncio.gather(*(send(ws, msg) for ws in list(S["clients"])))
        await asyncio.sleep(DT / S["speed"])


@app.on_event("startup")
async def _start():
    load_live(speed=2.0)
    asyncio.create_task(loop())


@app.get("/state")
def state():
    return snapshot()


@app.get("/events")
def events():
    return [_ev(e) for e in S["sim"].pl.all_events]


@app.get("/scenarios")
def scenarios():
    return [{"key": k, "title": v[0]} for k, v in SCENARIOS.items()]


@app.post("/scenario/{name}", dependencies=[Depends(need_client_header)])
async def play(name: str, speed: float = 10.0):
    if name not in SCENARIOS:
        raise HTTPException(404, "unknown scenario")
    if S["sim"].pl.fsm.review_required:
        raise HTTPException(409, "review required: clear it before starting a new scenario")
    S["speed"] = min(max(speed, 1.0), 50.0)
    load(name)
    return snapshot()


@app.post("/live", dependencies=[Depends(need_client_header)])
async def start_live(speed: float = 2.0):
    if S["sim"] and S["sim"].pl.fsm.review_required:
        raise HTTPException(409, "review required: clear it before resetting live stream")
    load_live(speed=speed)
    return snapshot()


@app.post("/live/inject/{kind}", dependencies=[Depends(need_client_header)])
async def inject_live(kind: str):
    valid = {"seizure", "hr_drop", "fall", "chewing", "electrode_off", "drop_link", "normal"}
    if kind not in valid:
        raise HTTPException(404, f"unknown live event: {kind}")
    if S["sim"].pl.fsm.review_required:
        raise HTTPException(409, "review required: clear it before triggering live events")
    if not S["live"] or S["sim"].done:
        load_live(speed=2.0)

    sim = S["sim"]
    s, t = sim.s, sim.t
    if kind == "normal":
        s.seizure = None
        s.clonic = False
        s.chewing = None
        s.walking = None
        s.electrode_off = None
        s.drop_window = None
        s.fall_at = None
        S["hr_drop"] = None
    elif kind == "seizure":
        s.seizure = (t, t + 45.0)
        s.clonic = True
    elif kind == "hr_drop":
        S["hr_drop"] = (t, t + 32.0)
    elif kind == "fall":
        s.fall_at = t + DT
    elif kind == "chewing":
        s.chewing = (t, t + 20.0)
    elif kind == "electrode_off":
        s.electrode_off = (t, t + 20.0)
    elif kind == "drop_link":
        s.drop_window = (t, t + 12.0)

    return snapshot()


@app.post("/abort", dependencies=[Depends(need_client_header)])
async def abort():   # async: runs between sim steps, never inside one
    sim = S["sim"]
    for a in sim.pl.fsm.abort(sim.pl.now, "manual"):
        sim.stim.abort(a, sim.pl.now)
    return snapshot()


@app.post("/clear_review", dependencies=[Depends(need_client_header)])
async def clear_review():
    S["sim"].pl.fsm.clear_review(S["sim"].pl.now)
    return snapshot()


@app.get("/results")
def results():
    out = []
    for k, (title, scn, check) in SCENARIOS.items():
        pl, st = run(scn)
        out.append({"key": k, "title": title, "pass": bool(check(pl, st))})
    return out


@app.websocket("/ws")
async def ws(w: WebSocket):
    origin = w.headers.get("origin")
    if origin and not re.match(LOCAL, origin):      # native app sends no Origin; browsers must be local
        await w.close(code=1008)
        return
    await w.accept()
    S["clients"].add(w)
    try:
        while True:
            await w.receive_text()
    except WebSocketDisconnect:
        S["clients"].discard(w)
