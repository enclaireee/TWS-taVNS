"""Regression tests for the parameters set from docs/research (one test per evidence-driven change)."""
import numpy as np
import pytest
from tws.contract import SensorPacket, StimCommand
from tws.safety.fsm import FsmConfig
from tws.safety.gate import SafetyGate
from tws.safety.stim import Limiter, Limits, rms_current_mA
from tws.signal import dsp
from tws.signal.detect import BandPowerDetector

FS_P = 48


def ppg(bpm, h2=0.5, seconds=12, seed=0):
    t = np.arange(int(seconds * FS_P)) / FS_P
    f0 = bpm / 60
    return np.sin(2 * np.pi * f0 * t) + h2 * np.sin(2 * np.pi * 2 * f0 * t + 0.6) + 0.02 * np.random.default_rng(seed).normal(size=len(t))


@pytest.mark.parametrize("bpm", [24, 26, 28, 30, 32, 35])
@pytest.mark.parametrize("h2", [0.5, 1.0, 1.5])
def test_bradycardia_with_ppg_harmonics_still_locks(bpm, h2):
    """~30 bpm is the documented ictal (R-R >= 2 s) and VNS lead-test bradycardia. A harmonic must not read as normal HR."""
    hr, ok = dsp.hr_from_ppg(ppg(bpm, h2), FS_P)
    assert SafetyGate().evaluate(1.0, hr, ok, False, False, [8, 8, 8]).lock
    if ok:
        assert abs(hr - bpm) < 4


@pytest.mark.parametrize("bpm", [45, 52, 60, 75, 100, 140, 180])
def test_normal_rates_with_harmonics_are_measured(bpm):
    hr, ok = dsp.hr_from_ppg(ppg(bpm, 0.4), FS_P)
    assert ok and abs(hr - bpm) < 4


def _win(freq_hz, amp, seed=0, fs=256):
    rng = np.random.default_rng(seed)
    t = np.arange(2 * fs) / fs
    x = rng.normal(0, 8, (3, len(t))) + 15 * np.sin(2 * np.pi * 10 * t)
    return x + amp * np.sin(2 * np.pi * freq_hz * t)


@pytest.mark.parametrize("freq_hz", [3.0, 6.0, 18.0])
def test_filterbank_detects_rhythms_across_0p5_to_25_hz(freq_hz):
    """3 Hz spike-wave, 5-9 Hz temporal theta and beta onsets are all inside the 0.5-25 Hz detector range."""
    det = BandPowerDetector().fit([dsp.features(_win(0, 0, s), 256) for s in range(20)])
    assert det.score(dsp.features(_win(freq_hz, 60), 256)) > det.thr
    assert det.score(dsp.features(_win(0, 0, 99), 256)) < det.thr


def test_bands_span_0p5_to_25_hz_in_8_equal_bands():
    assert len(dsp.BANDS) == 8 and dsp.BANDS[0][0] == 0.5 and dsp.BANDS[-1][1] == 25.0
    widths = {round(hi - lo, 6) for lo, hi in dsp.BANDS}
    assert len(widths) == 1


def test_detector_persistence_spans_6_s():
    d = BandPowerDetector()
    assert dsp.WIN_S + (d.persist_n - 1) * dsp.STRIDE_S == 6.0


def test_responsive_on_time_is_60_s_and_limiter_allows_it():
    c = FsmConfig()
    assert c.responsive_s == 60.0 and c.max_per_hour * c.responsive_s / 3600 == pytest.approx(0.10)
    assert Limiter().check(StimCommand(c.amp_mA, c.freq_Hz, c.pw_us, c.responsive_s, "cymba_left", "responsive", 1)) is None


def test_current_density_limit():
    worst = StimCommand(5.0, 30.0, 500.0, 60.0, "cymba_left", "responsive", 1)
    assert rms_current_mA(worst) == pytest.approx(5 * np.sqrt(0.03))
    assert Limiter().check(worst) is None                                     # 1.73 mA/cm2 on 0.5 cm2
    assert "current density" in Limiter(Limits(electrode_area_cm2=0.4)).check(worst)


def test_gate_thresholds_from_evidence():
    g = SafetyGate()
    assert g.evaluate(1.0, 70, True, False, False, [41, 41, 41]).hold          # > 40 kOhm: unusable
    assert not g.evaluate(2.0, 70, True, False, False, [39, 39, 39]).hold
    g.evaluate(3.0, 70, True, False, True, [8, 8, 8])                         # fall-then-still detected
    assert g.evaluate(3.0 + 179, 70, True, False, False, [8, 8, 8]).lock      # held through 3 min
    assert not g.evaluate(3.0 + 181, 70, True, False, False, [8, 8, 8]).lock


def test_contract_ppg_default_matches_packet_length():
    p = SensorPacket(t_start=0, seq=0, fs_eeg=256, eeg=[[0.0]])
    assert p.fs_ppg * 0.25 == int(p.fs_ppg * 0.25)
