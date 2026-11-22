"""Transport interface + SimLink: deterministic lossy link on a virtual clock (no sleeping, so tests are instant)."""
from __future__ import annotations
import heapq, random
from typing import Protocol


class Transport(Protocol):
    def send(self, frame: bytes, now: float) -> None: ...
    def poll(self, now: float) -> list[bytes]: ...


class SimLink:
    """loss: drop probability. delay/jitter in seconds. Jitter > packet interval causes reordering."""

    def __init__(self, loss=0.0, delay=0.0, jitter=0.0, seed=0):
        self.loss, self.delay, self.jitter = loss, delay, jitter
        self._rng = random.Random(seed)
        self._q: list = []
        self._n = 0

    def send(self, frame: bytes, now: float) -> None:
        if self._rng.random() < self.loss:
            return
        due = now + self.delay + self._rng.uniform(0, self.jitter)
        heapq.heappush(self._q, (due, self._n, frame))
        self._n += 1

    def poll(self, now: float) -> list[bytes]:
        out = []
        while self._q and self._q[0][0] <= now:
            out.append(heapq.heappop(self._q)[2])
        return out
