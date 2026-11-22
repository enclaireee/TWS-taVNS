"""Detector interface + baseline per-patient detector. Swap for gradient boosting without touching other modules."""
from __future__ import annotations
from typing import Protocol
import numpy as np


class SeizureDetector(Protocol):
    def score(self, feat: dict) -> float: ...


class BandPowerDetector:
    """Score = 12.5-25 Hz power relative to this patient's calm baseline (fit from a calm recording)."""

    def __init__(self, thr=8.0, persist_n=3):
        self.thr, self.persist_n, self.base = thr, persist_n, None

    def fit(self, calm_feats: list[dict]):
        self.base = float(np.median([np.mean(f["bp_12_25"]) for f in calm_feats]))
        return self

    def score(self, feat: dict) -> float:
        return float(max(feat["bp_12_25"]) / (self.base + 1e-12))


class Persistence:
    """Candidate only after N consecutive over-threshold, clean windows."""

    def __init__(self, n):
        self.n, self.c = n, 0

    def update(self, over: bool, clean: bool) -> bool:
        self.c = self.c + 1 if (over and clean) else 0
        return self.c >= self.n
