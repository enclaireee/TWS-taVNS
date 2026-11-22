"""Detector interface + baseline per-patient detector. Swap for gradient boosting without touching other modules."""
from __future__ import annotations
from typing import Protocol
import numpy as np


class SeizureDetector(Protocol):
    def score(self, feat: dict) -> float: ...


class BandPowerDetector:
    """Score = largest filterbank band power (any channel, any of the 8 bands in 0.5-25 Hz) relative to this
    patient's calm baseline for that band (fit from a calm recording). Patient-specific, as in Shoeb & Guttag 2010.
    persist_n=5 one-second-stride windows of 2 s span 6 s, the minimum persistence EEG readers require (Shoeb & Guttag
    2010, W=3 x 2 s). thr=8 (9 dB) is a design value to be fitted per patient on CHB-MIT / ear-EEG (sec. 5.3-5.4)."""

    def __init__(self, thr=8.0, persist_n=5):
        self.thr, self.persist_n, self.base = thr, persist_n, None

    def fit(self, calm_feats: list[dict]):
        self.base = np.median([np.mean(f["bands"], axis=0) for f in calm_feats], axis=0)   # [band]
        return self

    def score(self, feat: dict) -> float:
        return float(np.max(np.asarray(feat["bands"]) / (self.base + 1e-12)))


class Persistence:
    """Candidate only after N consecutive over-threshold, clean windows."""

    def __init__(self, n):
        self.n, self.c = n, 0

    def update(self, over: bool, clean: bool) -> bool:
        self.c = self.c + 1 if (over and clean) else 0
        return self.c >= self.n
