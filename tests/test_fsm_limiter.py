from tws.safety.fsm import StateMachine, State, FsmConfig
from tws.safety.gate import GateResult, SafetyGate
from tws.safety.stim import Limiter
from tws.contract import StimCommand, Abort

OK, LOCK = GateResult(), GateResult(lock=True, reasons=["brady"])
kinds = lambda fsm: [e.kind for e in fsm.events]


def test_responsive_then_cooldown_then_monitor():
    f = StateMachine(FsmConfig(cooldown_s=10))
    (c,) = f.step(0, True, OK, True)
    assert c.reason == "responsive" and f.state == State.STIM
    assert f.step(5, True, OK, True) == [] and f.state == State.STIM     # no retrigger mid-packet
    f.step(31, False, OK, True); assert f.state == State.COOLDOWN
    assert f.step(32, True, OK, True) == []                              # cooldown rejects
    f.step(42, False, OK, True); assert f.state == State.MONITOR


def test_lock_blocks_responsive_and_scheduled_and_aborts_running_stim():
    f = StateMachine()
    f.step(0, True, OK, True)
    (a,) = f.step(5, False, LOCK, True)
    assert isinstance(a, Abort) and f.state == State.LOCKED
    assert f.step(6, True, LOCK, True, scheduled_due=True) == []
    assert "reject" in kinds(f)


def test_link_loss_safe_mode_and_recovery():
    f = StateMachine()
    f.step(0, True, OK, True)
    (a,) = f.step(1, True, OK, False)
    assert a.cause == "link_lost" and f.state == State.SAFE_MODE
    assert f.step(2, True, OK, False) == []
    f.step(3, False, OK, True); assert f.state == State.COOLDOWN   # aborted stim still owes its cooldown
    f.step(200, False, OK, True); assert f.state == State.MONITOR


def test_hold_and_rate_cap():
    f = StateMachine(FsmConfig(cooldown_s=0, responsive_s=1, max_per_hour=2))
    assert f.step(0, True, GateResult(hold=True, reasons=["x"]), True) == []
    n = 0
    for t in range(10, 100, 5):
        n += len(f.step(t, True, OK, True))
    assert n == 2


def test_manual_abort_requires_review():
    f = StateMachine()
    f.step(0, True, OK, True)
    assert f.abort(1)
    assert f.step(5, True, OK, True) == []
    f.clear_review(6)
    assert f.step(7, True, OK, True) == []   # cooldown owed after the abort
    assert f.step(200, True, OK, True)   # stim allowed again


def test_limiter_rejects_over_limit():
    L = Limiter()
    good = StimCommand(1, 25, 250, 30, "cymba_left", "responsive", 1)
    assert L.check(good) is None
    for bad in (dict(amp_mA=9), dict(pw_us=900), dict(freq_Hz=500), dict(duration_s=600), dict(site="x"), dict(reason="y")):
        assert L.check(StimCommand(**{**good.__dict__, **bad}))


def test_hr_gate_relative_baseline_sleep_vs_awake():
    g = SafetyGate()
    for t in range(0, 120):                       # sleeping baseline 52 bpm
        g.evaluate(t, 52, True, True, False, [10, 10, 10])
    assert not g.evaluate(121, 50, True, True, False, [10] * 3).lock    # normal sleep HR: no lock
    assert g.evaluate(122, 30, True, True, False, [10] * 3).lock        # rapid drop: lock
    assert g.evaluate(123, 50, True, True, False, [10] * 3).lock is False
    assert g.evaluate(124, None, False, True, False, [10] * 3).lock     # no HR: safe path
    assert g.evaluate(125, 52, True, True, False, [90] * 3).hold        # all electrodes off
