"""The only place that knows the whole chain: link -> dsp -> detect -> safety -> fsm -> limiter -> stimulator."""
from __future__ import annotations
import numpy as np
from tws.signal import dsp
from tws.contract import decode, BadFrame, Event, StimCommand, Abort, SensorPacket
from tws.signal.detect import Persistence
from tws.safety.fsm import State


class Pipeline:
    def __init__(self, link, detector, gate, fsm, limiter, stim, late_s=1.0, pkt_s=0.25):
        self.link, self.det, self.gate, self.fsm, self.lim, self.stim = link, detector, gate, fsm, limiter, stim
        self.late_s, self.pkt_s = late_s, pkt_s
        self.persist = Persistence(getattr(detector, "persist_n", 3))
        self.events: list[Event] = []
        self._eeg = self._ppg = self._imu = None
        self._fs = (256, 48, 48)
        self._last_rx = 0.0
        self._last_t_start = 0.0
        self._seq = None
        self._since_win = 0
        self._imp = [0.0, 0.0, 0.0]
        self._over = self._clean = False
        self.lost = 0
        self._gap_t = -1e9      # last sequence gap: counts as a bad link for late_s
        self._win_t = -1e9      # last time a detector window was computed
        self.persist_ok = False
        self.hr, self.last_gate, self.link_ok, self.now = None, None, False, 0.0

    def _ingest(self, p, now):
        if self._seq is not None and p.seq != self._seq + 1:
            self.lost += max(0, p.seq - self._seq - 1)
            self._gap_t = now
            self._eeg = self._ppg = self._imu = None   # discontinuity: refill, never splice across a gap
            self._since_win = 0
            self.persist_ok, self.persist.c = False, 0
        self._seq = p.seq
        self._last_rx, self._last_t_start = now, p.t_start
        self._fs = (p.fs_eeg, p.fs_ppg, p.fs_ppg)
        eeg = np.array(p.eeg, dtype=float)
        if p.stim_active:
            eeg = dsp.blank(eeg, p.fs_eeg, p.t_start, self.fsm.cfg.freq_Hz)
        cat = lambda old, new, keep: new if old is None else np.concatenate([old, new], axis=-1)[..., -keep:]
        self._eeg = cat(self._eeg, eeg, int(dsp.WIN_S * p.fs_eeg))
        self._ppg = cat(self._ppg, np.array(p.ppg, dtype=float)[None], int(12 * p.fs_ppg))[0:1]
        mag = np.linalg.norm(np.array(p.imu, dtype=float)[:, :3], axis=1)[None]
        self._imu = cat(self._imu, mag, int(12 * p.fs_ppg))
        self._imp = list(p.impedance) or self._imp
        self._since_win += 1

    def _window(self):
        fs = self._fs[0]
        if self._eeg is None or self._eeg.shape[1] < dsp.WIN_S * fs or self._since_win * self.pkt_s < dsp.STRIDE_S:
            return
        self._since_win, self._win_t = 0, self.now
        feat = dsp.features(self._eeg, fs)
        self._clean = not dsp.is_artefact(feat)
        self._over = self.det.score(feat) > self.det.thr
        self.persist_ok = self.persist.update(self._over, self._clean)

    def tick(self, now, asleep=False, scheduled_due=False):
        self.now = now
        for f in self.link.poll(now):
            try:
                p = decode(f)
                if not isinstance(p, SensorPacket):
                    raise BadFrame("uplink accepts SensorPacket only")
                self._ingest(p, now)
            except (BadFrame, ValueError):   # ValueError: channel count changed mid-stream
                self.events.append(Event(now, "reject", {"why": "bad frame"}))
        self._window()
        link_ok = (now - self._gap_t > self.late_s) and (now - self._last_rx <= self.late_s) and (now - self._last_t_start <= self.late_s + self.pkt_s)
        fresh = now - self._last_rx <= self.late_s
        hr, ppg_ok = dsp.hr_from_ppg(self._ppg[0], self._fs[1]) if (self._ppg is not None and fresh) else (None, False)
        fall = dsp.fall_then_still(self._imu[0], self._fs[2]) if (self._imu is not None and fresh) else False
        g = self.gate.evaluate(now, hr, ppg_ok, asleep, fall, self._imp)
        self.hr, self.last_gate, self.link_ok, self.now = hr, g, link_ok, now
        cand = self.persist_ok and link_ok and now - self._win_t <= 2 * dsp.STRIDE_S
        for a in self.fsm.step(now, cand, g, link_ok, scheduled_due):
            if isinstance(a, Abort):
                self.stim.abort(a, now)
            elif isinstance(a, StimCommand):
                why = self.lim.check(a)
                if why:
                    self.events.append(Event(now, "reject", {"why": "limiter: " + why}))
                    self.fsm.abort(now, "limiter")
                else:
                    self.stim.apply(a, now)
        if self.fsm.state != State.STIM:
            self.stim.finish(now)

    def telemetry(self) -> dict:
        g = getattr(self, "last_gate", None)
        base = self.gate.baseline(False)
        return {"t": getattr(self, "now", 0.0), "state": self.fsm.state.value, "hr": getattr(self, "hr", None),
                "hr_baseline": base, "link_ok": getattr(self, "link_ok", False), "lost": self.lost,
                "lock_reasons": g.reasons if g else [], "review_required": self.fsm.review_required,
                "stimulating": self.stim.active is not None}

    @property
    def all_events(self):
        return sorted(self.fsm.events + self.events, key=lambda e: e.t)
