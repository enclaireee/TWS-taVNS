"""Signal processing: windows, features, artefact rules, stimulation blanking, HR from PPG, IMU context."""
from __future__ import annotations
import numpy as np

WIN_S, STRIDE_S = 2.0, 1.0


def band_power(x, fs, lo, hi):
    f = np.fft.rfftfreq(len(x), 1 / fs)
    p = np.abs(np.fft.rfft((x - x.mean()) * np.hanning(len(x)))) ** 2
    return float(p[(f >= lo) & (f <= hi)].sum())


def features(win, fs):
    """win: [ch][n] in uV -> dict of per-channel lists (line length, 12.5-25 Hz power, entropy, p2p, emg ratio)."""
    ll, bp, ent, p2p, emg = [], [], [], [], []
    for x in win:
        ll.append(float(np.abs(np.diff(x)).sum()))
        bp.append(band_power(x, fs, 12.5, 25))
        f = np.fft.rfftfreq(len(x), 1 / fs)
        p = np.abs(np.fft.rfft((x - x.mean()) * np.hanning(len(x)))) ** 2
        q = p[(f >= 1) & (f <= 45)]
        q = q / (q.sum() + 1e-12)
        ent.append(float(-(q * np.log(q + 1e-12)).sum()))
        p2p.append(float(np.ptp(x)))
        emg.append(band_power(x, fs, 40, 100) / (band_power(x, fs, 1, 100) + 1e-12))
    return {"line_length": ll, "bp_12_25": bp, "entropy": ent, "p2p": p2p, "emg_ratio": emg}


def is_artefact(feat, p2p_max=300.0, emg_max=0.25) -> bool:
    """EEG-only rule (motion, chewing, lifted electrode). IMU is deliberately not used here: clonic movement is a seizure sign."""
    return max(feat["p2p"]) > p2p_max or max(feat["emg_ratio"]) > emg_max


def blank(x, fs, t0, stim_freq, width_s=0.005):
    """Replace samples within width_s after each stimulation pulse by linear interpolation. x: [ch][n]."""
    x = np.array(x, dtype=float)
    ts = t0 + np.arange(x.shape[1]) / fs
    period = 1.0 / stim_freq
    mask = (ts % period) <= width_s
    if mask.all() or not mask.any():
        return x
    idx = np.arange(x.shape[1])
    for c in range(x.shape[0]):
        x[c, mask] = np.interp(idx[mask], idx[~mask], x[c, ~mask])
    return x


def hr_from_ppg(ppg, fs, min_s=8.0):
    """Return (bpm, ok). Spectral peak in 0.6-3.5 Hz; ok = peak holds a clear share of band power."""
    ppg = np.asarray(ppg, dtype=float)
    if len(ppg) < min_s * fs:
        return None, False
    x = ppg[-int(min_s * fs):]
    n = len(x) * 8
    f = np.fft.rfftfreq(n, 1 / fs)
    p = np.abs(np.fft.rfft((x - x.mean()) * np.hanning(len(x)), n)) ** 2
    band = (f >= 0.6) & (f <= 3.5)
    i = np.argmax(np.where(band, p, 0))
    share = p[(f > f[i] - 0.15) & (f < f[i] + 0.15)].sum() / (p[band].sum() + 1e-12)
    return float(f[i] * 60), bool(share > 0.4)


def fall_then_still(acc_mag, fs, now_window_s=2.0, lookback_s=10.0, spike_g=1.5, still_std=0.05) -> bool:
    """One hard impact in the last lookback_s, followed by stillness. acc_mag in g (1.0 = rest)."""
    a = np.asarray(acc_mag, dtype=float)
    k = int(now_window_s * fs)
    if len(a) < int(lookback_s * fs / 2):
        return False
    recent, before = a[-k:], a[-int(lookback_s * fs):-k]
    return bool(len(before) and np.abs(before - 1).max() > spike_g and recent.std() < still_std)
