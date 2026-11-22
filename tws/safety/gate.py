"""Safety gates: PPG/IMU/impedance decide whether stimulating is allowed. They never trigger stimulation."""
from __future__ import annotations
from collections import deque
from dataclasses import dataclass, field
from statistics import median


@dataclass
class GateResult:
    lock: bool = False                 # sticky safety lockout (brady, syncope-like, no HR)
    hold: bool = False                 # transient: no usable EEG channel
    reasons: list = field(default_factory=list)
    bad_channels: list = field(default_factory=list)


@dataclass
class GateConfig:
    drop_frac: float = 0.30            # rapid HR drop vs baseline
    recover_frac: float = 0.10         # lock clears when HR within 10% of baseline again
    impedance_max_kohm: float = 50.0   # ponytail: placeholder threshold, tune on hardware
    baseline_window_s: float = 300.0
    min_baseline_s: float = 30.0
    still_hold_s: float = 60.0         # keep lock after a fall-then-still pattern
    abs_floor_bpm: float = 40.0        # ponytail: PLACEHOLDER absolute bradycardia floor, clinical value needed


class SafetyGate:
    def __init__(self, cfg: GateConfig = GateConfig()):
        self.c = cfg
        self._hr = {False: deque(), True: deque()}   # asleep -> (t, bpm); separate baselines for sleep/awake
        self._locked_hr = False
        self._fall_until = -1.0

    def baseline(self, asleep: bool):
        d = self._hr[asleep]
        if len(d) < 2 or d[-1][0] - d[0][0] < self.c.min_baseline_s:
            return None
        return median(b for _, b in d)

    def _learn(self, now, hr, asleep):
        d = self._hr[asleep]
        d.append((now, hr))
        while d and now - d[0][0] > self.c.baseline_window_s:
            d.popleft()

    def evaluate(self, now, hr_bpm, ppg_ok, asleep, fall_then_still, impedance) -> GateResult:
        c, r = self.c, GateResult()
        r.bad_channels = [i for i, z in enumerate(impedance) if z > c.impedance_max_kohm]
        if impedance and len(r.bad_channels) == len(impedance):
            r.hold = True
            r.reasons.append("no usable EEG channel")
        if fall_then_still:
            self._fall_until = now + c.still_hold_s
        if now < self._fall_until:
            r.lock = True
            r.reasons.append("fall-then-still (syncope-like)")
        if not ppg_ok or hr_bpm is None:
            r.lock = True
            r.reasons.append("HR unavailable (safe path)")
            return r
        if hr_bpm < c.abs_floor_bpm:       # absolute floor: independent of any (possibly drifted) baseline
            r.lock = True
            r.reasons.append("bradycardia (absolute floor)")
            return r
        base = self.baseline(asleep)
        if base is not None and hr_bpm < base * (1 - c.drop_frac):
            self._locked_hr = True
        elif self._locked_hr and base is not None and hr_bpm >= base * (1 - c.recover_frac):
            self._locked_hr = False
        if self._locked_hr:
            r.lock = True
            r.reasons.append("bradycardia vs baseline")
        else:
            self._learn(now, hr_bpm, asleep)   # don't pollute baseline while locked
        return r
