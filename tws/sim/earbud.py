"""Synthetic earbud: EEG (3 ch), PPG, IMU, impedance, with scripted events. Emits SensorPackets every 250 ms."""
from __future__ import annotations
from dataclasses import dataclass, field
import numpy as np
from tws.contract import SensorPacket, encode
from tws.signal.detect import BandPowerDetector
from tws.safety.fsm import StateMachine
from tws.link import SimLink
from tws.pipeline import Pipeline
from tws.safety.gate import SafetyGate
from tws.safety.stim import FakeStimulator, Limiter
from tws.signal import dsp

FS_E, FS_P, DT, CH = 256, 48, 0.25, 3


@dataclass
class Scenario:
    name: str
    duration: float = 150.0
    seizure: tuple | None = None          # (t0, t1): 18 Hz EEG burst
    clonic: bool = False                  # rhythmic IMU during seizure
    hr: callable = lambda t: 70.0         # bpm over time
    asleep: bool = False
    fall_at: float | None = None          # hard impact then stillness
    chewing: tuple | None = None          # (t0, t1) EMG artefact bursts
    walking: tuple | None = None
    electrode_off: tuple | None = None    # (t0, t1) all channels off
    link: dict = field(default_factory=dict)   # SimLink kwargs
    drop_window: tuple | None = None      # (t0, t1) packets not sent
    schedule_at: float | None = None
    warmup: float = 60.0                  # calm period used to fit the detector and HR baseline


def _in(t, w):
    return w is not None and w[0] <= t < w[1]


class Earbud:
    def __init__(self, s: Scenario, seed=0):
        self.s, self.rng, self.seq = s, np.random.default_rng(seed), 0

    def packet(self, t, stim_active=False) -> SensorPacket:
        s, rng = self.s, self.rng
        n = int(FS_E * DT)
        ts = t + np.arange(n) / FS_E
        eeg = rng.normal(0, 8, (CH, n))
        eeg += 15 * np.sin(2 * np.pi * 10 * ts)                     # alpha-like background
        imp = [8.0] * CH
        if _in(t, s.seizure):
            eeg += 60 * np.sin(2 * np.pi * 18 * ts)
        if _in(t, s.chewing) or _in(t, s.walking):
            eeg += rng.normal(0, 250, (CH, n)) * (rng.random() < 0.8)   # broadband bursts
        if _in(t, s.electrode_off):
            eeg = rng.normal(0, 400, (CH, n)); imp = [250.0] * CH
        tp = t + np.arange(int(FS_P * DT)) / FS_P
        hr = s.hr(t)
        ppg = np.sin(2 * np.pi * hr / 60 * tp) + 0.05 * rng.normal(size=len(tp))
        imu = np.zeros((len(tp), 6)); imu[:, 2] = 1.0
        imu += 0.01 * rng.normal(size=imu.shape)
        if s.clonic and _in(t, s.seizure):
            imu[:, 0] += 0.4 * np.sin(2 * np.pi * 3 * tp)
        if _in(t, s.walking):
            imu[:, 2] += 0.5 * np.sin(2 * np.pi * 2 * tp)
        if s.fall_at is not None and t <= s.fall_at < t + DT:
            imu[0, 2] += 3.0
        p = SensorPacket(t_start=t, seq=self.seq, fs_eeg=FS_E, eeg=eeg.tolist(), fs_ppg=FS_P, ppg=ppg.tolist(),
                         imu=imu.tolist(), impedance=imp, stim_active=stim_active)
        self.seq += 1
        return p


class Sim:
    """Steppable scenario: one step() = one 250 ms packet through the whole pipeline."""

    def __init__(self, s: Scenario, seed=0, **fsm_kw):
        from tws.safety.fsm import FsmConfig
        self.s, self.t = s, 0.0
        self.ear, self.link = Earbud(s, seed), SimLink(seed=seed, **s.link)
        calm = Earbud(Scenario("calm"), seed + 1)      # same synthetic patient, calm: fits the detector
        feats, buf = [], np.zeros((CH, 0))
        for i in range(int(30 / DT)):
            buf = np.concatenate([buf, np.array(calm.packet(i * DT).eeg)], axis=1)[:, -2 * FS_E:]
            if buf.shape[1] == 2 * FS_E and i % 4 == 0:
                feats.append(dsp.features(buf, FS_E))
        self.stim = FakeStimulator()
        self.pl = Pipeline(self.link, BandPowerDetector().fit(feats), SafetyGate(),
                           StateMachine(FsmConfig(**fsm_kw)), Limiter(), self.stim)

    @property
    def done(self):
        return self.t >= self.s.duration

    def step(self):
        s, t, now = self.s, self.t, self.t + DT
        if not _in(t, s.drop_window):
            self.link.send(encode(self.ear.packet(t, self.stim.active is not None)), now)
        else:
            self.ear.seq += 1
        self.pl.tick(now, asleep=s.asleep, scheduled_due=s.schedule_at is not None and abs(now - s.schedule_at) < DT / 2)
        self.t += DT


def run(s: Scenario, seed=0, **fsm_kw):
    """Run a scenario to the end. Returns (pipeline, stimulator)."""
    sim = Sim(s, seed, **fsm_kw)
    while not sim.done:
        sim.step()
    return sim.pl, sim.stim
