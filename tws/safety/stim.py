"""Software current limiter + a stimulator that only logs. Real hardware enforces its own limits in firmware.
Limit sources: docs/research/tws-tavns-evidence.pdf, sec. 4.5 (electrical safety)."""
from __future__ import annotations
import math
from dataclasses import dataclass, field
from tws.contract import StimCommand, Abort


@dataclass(frozen=True)
class Limits:
    max_amp_mA: float = 5.0            # titration range: cMPsE02 means 0.5-1.0 mA; tragus 200% PT 3.0 mA @500 us, 5.3 mA @200 us
    max_pw_us: float = 500.0           # per phase; widest pulse tested for taVNS heart-rate safety (Badran 2018)
    freq_Hz: tuple = (1.0, 30.0)       # 1 Hz (cMPsE02 control) to 30 Hz (top of the 20-30 Hz range most taVNS studies use)
    max_duration_s: dict = field(default_factory=lambda: {"responsive": 60.0, "scheduled": 1800.0})
    sites: tuple = ("cymba_left",)
    # r.m.s. current density limit used in IEC 60601-2-10 risk analyses (FDA 510(k) K241678 summary).
    max_current_density_mA_cm2: float = 2.0
    # Stimulating electrode contact area. PLACEHOLDER until the earbud electrode is measured; the worst case
    # allowed by the limits above (5 mA, 500 us, 30 Hz, biphasic) needs >= 0.433 cm2 to stay under 2 mA/cm2.
    electrode_area_cm2: float = 0.5


def rms_current_mA(c: StimCommand) -> float:
    """Biphasic symmetric pulses: two phases of pw_us per period (conservative vs monophasic)."""
    duty = 2 * c.pw_us * 1e-6 * c.freq_Hz
    return c.amp_mA * math.sqrt(min(duty, 1.0))


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
        j = rms_current_mA(c) / l.electrode_area_cm2
        if j > l.max_current_density_mA_cm2:
            return f"current density {j:.2f} mA/cm2 rms over {l.max_current_density_mA_cm2}"
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
