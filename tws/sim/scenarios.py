"""The 9 doc scenarios: (Scenario, expected-outcome check). Shared by pytest, the server demo and the web results table."""
from tws.safety.fsm import State
from tws.sim.earbud import Scenario

W = 60.0  # warm-up


def _n(st):
    return [e for e in st.log if e[1] == "apply"]


def _locked(pl, after=10):
    return any(e.kind == "lock" and e.t > after for e in pl.all_events)


SCENARIOS = {
    "seizure_clonic_normal_hr": (
        "Seizure + normal HR + clonic: responsive stim, then cooldown",
        Scenario("seizure_clonic_normal_hr", seizure=(W + 10, W + 60), clonic=True),
        lambda pl, st: len(_n(st)) == 1 and _n(st)[0][2].reason == "responsive"
        and pl.fsm.state in (State.COOLDOWN, State.MONITOR)),
    "sleep_seizure_low_hr": (
        "Sleep seizure with normally low HR: not locked",
        Scenario("sleep_seizure_low_hr", seizure=(W + 10, W + 60), hr=lambda t: 52.0, asleep=True),
        lambda pl, st: len(_n(st)) == 1 and not _locked(pl)),
    "rapid_hr_drop": (
        "Rapid HR drop: lock, no stim",
        Scenario("rapid_hr_drop", seizure=(W + 20, W + 70), hr=lambda t: 70.0 if t < W + 10 else 35.0),
        lambda pl, st: not _n(st) and _locked(pl)),
    "fall_then_still": (
        "Single fall hit then still: lock, no stim",
        Scenario("fall_then_still", seizure=(W + 20, W + 70), fall_at=W + 10),
        lambda pl, st: not _n(st) and _locked(pl)),
    "chewing_walking": (
        "Chewing / fast walking: artefact rejected",
        Scenario("chewing_walking", chewing=(W + 10, W + 40), walking=(W + 45, W + 70)),
        lambda pl, st: not _n(st)),
    "electrode_off": (
        "Electrode off / high impedance: channel ignored, stim held",
        Scenario("electrode_off", seizure=(W + 10, W + 60), electrode_off=(W + 5, W + 70)),
        lambda pl, st: not _n(st)),
    "late_packets": (
        "Late / missing packets: safe mode, no stim",
        Scenario("late_packets", seizure=(W + 10, W + 60), drop_window=(W + 5, W + 30)),
        lambda pl, st: any(e.kind == "safe_mode" for e in pl.all_events)
        and not [e for e in _n(st) if W + 5 < e[0] < W + 30]),
    "schedule_while_locked": (
        "Scheduled stim arrives while locked: rejected",
        Scenario("schedule_while_locked", hr=lambda t: 70.0 if t < W + 10 else 35.0, schedule_at=W + 30),
        lambda pl, st: not _n(st) and any(e.kind == "reject" for e in pl.all_events)),
    "clean": (
        "Quiet night: no stim, no lock",
        Scenario("clean"),
        lambda pl, st: not _n(st)),
}
