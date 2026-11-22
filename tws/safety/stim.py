"""Software current limiter + a stimulator that only logs. Real hardware enforces its own limits in firmware."""
from __future__ import annotations
from dataclasses import dataclass, field
from tws.contract import StimCommand, Abort

# ponytail: PLACEHOLDER limits from the doc's titration range. Final values must come from IEC 60601-2-10 text, not here.
@dataclass(frozen=True)
class Limits:
    max_amp_mA: float = 5.0
    max_pw_us: float = 500.0
    freq_Hz: tuple = (1.0, 30.0)
    max_duration_s: dict = field(default_factory=lambda: {"responsive": 30.0, "scheduled": 1800.0})
    sites: tuple = ("cymba_left",)


class Limiter:
    def __init__(self, limits: Limits = Limits()):
        self.l = limits

    def check(self, c: StimCommand) -> str | None:
        """Return None if allowed, else the rejection reason."""
        l = self.l
        if not (0 < c.amp_mA <= l.max_amp_mA): return f"amp {c.amp_mA} mA outside (0, {l.max_amp_mA}]"
        if not (0 < c.pw_us <= l.max_pw_us): return f"pulse width {c.pw_us} us outside (0, {l.max_pw_us}]"
        if not (l.freq_Hz[0] <= c.freq_Hz <= l.freq_Hz[1]): return f"freq {c.freq_Hz} Hz outside {l.freq_Hz}"
        cap = l.max_duration_s.get(c.reason)
        if cap is None: return f"unknown reason {c.reason!r}"
        if not (0 < c.duration_s <= cap): return f"duration {c.duration_s} s outside (0, {cap}] for {c.reason}"
        if c.site not in l.sites: return f"unknown site {c.site!r}"
        return None


class FakeStimulator:
    """Logs what would be delivered. Same interface a real driver would implement."""

    def __init__(self):
        self.log: list = []
        self.active: StimCommand | None = None

    def apply(self, c: StimCommand, now: float) -> None:
        self.active = c
        self.log.append((now, "apply", c))

    def abort(self, a: Abort, now: float) -> None:
        self.active = None
        self.log.append((now, "abort", a))

    def finish(self, now: float) -> None:
        if self.active:
            self.log.append((now, "done", self.active))
            self.active = None
