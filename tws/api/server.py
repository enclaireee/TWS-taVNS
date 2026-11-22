"""App/dashboard API: live telemetry over WebSocket, history + control over REST. Runs a simulated earbud.
The app link is optional: the pipeline keeps running (and stays safe) with no client connected."""
from __future__ import annotations
import asyncio, dataclasses, re
from fastapi import Depends, FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from tws.sim.earbud import DT, Sim, run
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

S = {"sim": None, "name": None, "speed": 10.0, "clients": set()}


def load(name: str):
    S["sim"], S["name"] = Sim(SCENARIOS[name][1]), name


def _ev(e):
    return {"t": round(e.t, 2), "kind": e.kind, "detail": e.detail}


def snapshot():
    sim = S["sim"]
    d = sim.pl.telemetry()
    d.update(scenario=S["name"], done=sim.done, speed=S["speed"],
             stim=dataclasses.asdict(sim.stim.active) if sim.stim.active else None)
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
    load("seizure_clonic_normal_hr")
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
