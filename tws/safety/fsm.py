"""Five-state machine. Detector only proposes; this decides. Safety lock and safe mode beat everything, scheduled included."""
from __future__ import annotations
from collections import deque
from dataclasses import dataclass
from enum import Enum
from tws.contract import StimCommand, Abort, Event, SITE_CYMBA_LEFT
from tws.safety.gate import GateResult


class State(str, Enum):
    MONITOR = "monitor"
    STIM = "stim"
    COOLDOWN = "cooldown"
    LOCKED = "locked"
    SAFE_MODE = "safe_mode"


@dataclass
class FsmConfig:
    """Defaults and their sources: docs/research/tws-tavns-evidence.pdf, sec. 4 and the audit table (sec. 7)."""
    amp_mA: float = 1.0                # start of per-patient titration (cMPsE02 25 Hz arm: 0.50 +- 0.47 mA)
    freq_Hz: float = 25.0              # Frangos 2015, cMPsE02 / NEMOS
    pw_us: float = 250.0               # per phase, biphasic (Frangos 2015, NEMOS)
    responsive_s: float = 60.0         # AspireSR AutoStim on-time (Fisher 2016); 60 s taVNS blocks safe (Badran 2018)
    scheduled_s: float = 1800.0        # one 30 min session (He 2013: 3 x 30 min/day)
    cooldown_s: float = 120.0          # design: keeps on/off duty <= 33% locally (intermittent, Agnew & McCreery 1990)
    max_per_hour: int = 6              # 6 x 60 s = 10% hourly duty, the VNS Normal Mode duty cycle (Fisher 2016)
    max_per_day: int = 30              # design: <= 30 min/day responsive, well below NEMOS 4-5 h/day
    responsive_enabled: bool = True


class StateMachine:
    def __init__(self, cfg: FsmConfig = FsmConfig()):
        self.cfg, self.state = cfg, State.MONITOR
        self.events: list[Event] = []
        self._end = 0.0
        self._cmd_id = 0
        self._starts: deque = deque()
        self.review_required = False   # set by manual abort; stays until clear_review()
        self._cd_until = 0.0           # an aborted stim still owes its cooldown

    def _ev(self, t, kind, **d):
        if kind == "reject" and self.events and self.events[-1].kind == "reject" and self.events[-1].detail == d:
            return   # same rejection every tick would flood the log
        self.events.append(Event(t, kind, d))

    def _go(self, t, s):
        if s != self.state:
            self._ev(t, "state", frm=self.state.value, to=s.value)
            self.state = s

    def _owe_cooldown(self, now):
        if now < self._cd_until:
            self._end = self._cd_until
            self._go(now, State.COOLDOWN)

    def _cmd(self, now, reason) -> StimCommand:
        c, self._cmd_id = self.cfg, self._cmd_id + 1
        dur = c.responsive_s if reason == "responsive" else c.scheduled_s
        self._starts.append(now)
        self._end = now + dur
        self._go(now, State.STIM)
        self._ev(now, "stim", reason=reason, cmd_id=self._cmd_id)
        return StimCommand(c.amp_mA, c.freq_Hz, c.pw_us, dur, SITE_CYMBA_LEFT, reason, self._cmd_id)

    def _abort(self, now, cause) -> list:
        if self.state != State.STIM:
            return []
        self._ev(now, "abort", cause=cause, cmd_id=self._cmd_id)
        self._cd_until = now + self.cfg.cooldown_s
        return [Abort(self._cmd_id, cause)]

    def abort(self, now, cause="manual") -> list:
        out = self._abort(now, cause)
        self.review_required = True
        self._go(now, State.LOCKED)
        return out

    def clear_review(self, now):
        self.review_required = False

    def step(self, now, candidate: bool, gate: GateResult, link_ok: bool, scheduled_due: bool = False) -> list:
        out: list = []
        c = self.cfg
        while self._starts and now - self._starts[0] > 86400:
            self._starts.popleft()

        if not link_ok:                                   # safe mode: no responsive stim at all
            out += self._abort(now, "link_lost")
            if self.state != State.SAFE_MODE:
                self._ev(now, "safe_mode", cause="late or missing packets")
            self._go(now, State.SAFE_MODE)
            if scheduled_due or candidate:
                self._ev(now, "reject", why="safe mode")
            return out
        if self.state == State.SAFE_MODE:
            self._go(now, State.MONITOR)
            self._owe_cooldown(now)

        if gate.lock or self.review_required:             # lock beats everything, scheduled included
            out += self._abort(now, "; ".join(gate.reasons) or "review required")
            if self.state != State.LOCKED:
                self._ev(now, "lock", reasons=gate.reasons)
            self._go(now, State.LOCKED)
            if scheduled_due or candidate:
                self._ev(now, "reject", why="locked", scheduled=scheduled_due)
            return out
        if self.state == State.LOCKED:
            self._ev(now, "unlock")
            self._go(now, State.MONITOR)
            self._owe_cooldown(now)

        if self.state == State.STIM and now >= self._end:
            self._go(now, State.COOLDOWN)
            self._end = now + c.cooldown_s
        elif self.state == State.COOLDOWN and now >= self._end:
            self._go(now, State.MONITOR)

        if self.state == State.MONITOR:
            hour = sum(1 for s in self._starts if now - s <= 3600)
            capped = hour >= c.max_per_hour or len(self._starts) >= c.max_per_day
            if scheduled_due:
                if capped:
                    self._ev(now, "reject", why="rate cap", scheduled=True)
                else:
                    out.append(self._cmd(now, "scheduled"))
            elif candidate and c.responsive_enabled:
                self._ev(now, "candidate")
                if gate.hold:
                    self._ev(now, "reject", why="hold: " + ", ".join(gate.reasons))
                elif capped:
                    self._ev(now, "reject", why="rate cap")
                else:
                    out.append(self._cmd(now, "responsive"))
        elif candidate:
            self._ev(now, "reject", why=f"state {self.state.value}")
        return out
