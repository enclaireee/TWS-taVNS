"""Signal processing: windows, features, artefact rules, stimulation blanking, HR from PPG, IMU context.
Parameter sources: docs/research/tws-tavns-evidence.pdf (section numbers in comments)."""
from __future__ import annotations
import numpy as np

WIN_S, STRIDE_S = 2.0, 1.0          # 2 s epochs, as in Shoeb & Guttag 2010 (sec. 5.2)
# 8 equal-width bands spanning 0.5-25 Hz, the range Shoeb & Guttag 2010 use because "most seizure and non-seizure
# EEG activity falls within this range" (sec. 5.3). Covers 3 Hz spike-wave, 5-9 Hz temporal-lobe theta and beta onsets.
BANDS = [(0.5 + i * 24.5 / 8, 0.5 + (i + 1) * 24.5 / 8) for i in range(8)]
HR_BAND_HZ = (0.4, 3.5)             # 24-210 bpm: must resolve the ~30 bpm ictal / VNS bradycardia (sec. 6.2)


def _spectrum(x, fs):
    f = np.fft.rfftfreq(len(x), 1 / fs)
    p = np.abs(np.fft.rfft((x - x.mean()) * np.hanning(len(x)))) ** 2
    return f, p


def features(win, fs):
    """win: [ch][n] in uV -> dict of per-channel lists (line length, filterbank powers, entropy, p2p, emg ratio)."""
    ll, bands, ent, p2p, emg = [], [], [], [], []
    for x in win:
        f, p = _spectrum(x, fs)
        ll.append(float(np.abs(np.diff(x)).sum()))
        bands.append([float(p[(f >= lo) & (f < hi)].sum()) for lo, hi in BANDS])
        q = p[(f >= 1) & (f <= 45)]
        q = q / (q.sum() + 1e-12)
        ent.append(float(-(q * np.log(q + 1e-12)).sum()))
        p2p.append(float(np.ptp(x)))
        # 40-100 Hz: temporalis EMG peaks at 40-80 Hz (Goncharova et al. 2003), above the 0.5-25 Hz detector range
        emg.append(float(p[(f >= 40) & (f <= 100)].sum() / (p[(f >= 1) & (f <= 100)].sum() + 1e-12)))
    return {"line_length": ll, "bands": bands, "entropy": ent, "p2p": p2p, "emg_ratio": emg}


def is_artefact(feat, p2p_max=300.0, emg_max=0.25) -> bool:
    """EEG-only rule (motion, chewing, lifted electrode). IMU is deliberately not used here: clonic movement is a seizure sign.
    Thresholds are design values with no ear-EEG validation yet (sec. 5.5)."""
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


def hr_from_ppg(ppg, fs, min_s=8.0, band=HR_BAND_HZ, sub_min_hz=0.25, sub_ratio=0.25):
    """Return (bpm, ok). Spectral peak in `band`; ok = peak holds a clear share of band power.
    PPG has strong harmonics, so if half the peak frequency also carries >= sub_ratio of the peak power the
    fundamental is taken to be that half. This errs toward the lower rate: a false low reading locks (safe),
    a harmonic read as a normal rate would hide a bradycardia (sec. 6.2)."""
    ppg = np.asarray(ppg, dtype=float)
    if len(ppg) < min_s * fs:
        return None, False
    x = ppg[-int(min_s * fs):]
    n = len(x) * 8
    f = np.fft.rfftfreq(n, 1 / fs)
    p = np.abs(np.fft.rfft((x - x.mean()) * np.hanning(len(x)), n)) ** 2
    inband = (f >= band[0]) & (f <= band[1])
    i = int(np.argmax(np.where(inband, p, 0)))
    near = (f > f[i] / 2 - 0.05) & (f < f[i] / 2 + 0.05)
    if f[i] / 2 >= sub_min_hz and near.any():
        j = int(np.flatnonzero(near)[np.argmax(p[near])])
        if p[j] >= sub_ratio * p[i]:
            i = j
    share = p[(f > f[i] - 0.15) & (f < f[i] + 0.15)].sum() / (p[inband | (f >= sub_min_hz) & (f < band[0])].sum() + 1e-12)
    return float(f[i] * 60), bool(share > 0.4)


def fall_then_still(acc_mag, fs, now_window_s=2.0, lookback_s=10.0, spike_g=1.5, still_std=0.05) -> bool:
    """One hard impact in the last lookback_s, followed by stillness. acc_mag in g (1.0 = rest).
    spike_g is deliberately below the 6 g ear-level fall-alarm threshold of Lindemann et al. 2005: here a false
    positive only withholds stimulation, so the rule is tuned for sensitivity and paired with stillness (sec. 6.4)."""
    a = np.asarray(acc_mag, dtype=float)
    k = int(now_window_s * fs)
    if len(a) < int(lookback_s * fs / 2):
        return False
    recent, before = a[-k:], a[-int(lookback_s * fs):-k]
    return bool(len(before) and np.abs(before - 1).max() > spike_g and recent.std() < still_std)
