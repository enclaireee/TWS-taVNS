"""The hardware/software boundary: two messages in/out plus events. Every other module imports only this."""
from __future__ import annotations
import json, zlib
from dataclasses import dataclass, field, asdict
from typing import Any

CONTRACT_VERSION = 1
SITE_CYMBA_LEFT = "cymba_left"


@dataclass
class SensorPacket:
    t_start: float            # seconds, device clock
    seq: int                  # increments by 1 per packet; gaps = lost packets
    fs_eeg: int
    eeg: list                 # [ch][n] ear-canal, cymba, reference
    fs_ppg: int = 50
    ppg: list = field(default_factory=list)
    imu: list = field(default_factory=list)       # [n][6]
    impedance: list = field(default_factory=list)  # kOhm per EEG channel
    stim_active: bool = False
    battery: float = 1.0
    fault_flags: int = 0


@dataclass
class StimCommand:
    amp_mA: float
    freq_Hz: float
    pw_us: float
    duration_s: float
    site: str
    reason: str               # "scheduled" | "responsive"
    cmd_id: int


@dataclass
class Abort:
    cmd_id: int
    cause: str


@dataclass
class Event:
    t: float
    kind: str                 # candidate | stim | reject | abort | lock | unlock | safe_mode | state
    detail: dict = field(default_factory=dict)


_TYPES = {c.__name__: c for c in (SensorPacket, StimCommand, Abort, Event)}


class BadFrame(ValueError):
    pass


def encode(msg: Any) -> bytes:
    body = json.dumps({"v": CONTRACT_VERSION, "type": type(msg).__name__, "data": asdict(msg)}).encode()
    return body + zlib.crc32(body).to_bytes(4, "big")


def decode(frame: bytes) -> Any:
    if len(frame) < 5:
        raise BadFrame("short frame")
    body, crc = frame[:-4], frame[-4:]
    if zlib.crc32(body).to_bytes(4, "big") != crc:
        raise BadFrame("crc mismatch")
    try:   # CRC is not authentication: anything past it is untrusted
        obj = json.loads(body, parse_constant=_no_const)
        if obj.get("v") != CONTRACT_VERSION or obj.get("type") not in _TYPES or not isinstance(obj.get("data"), dict):
            raise BadFrame("unknown version/type")
        msg = _TYPES[obj["type"]](**obj["data"])
        if isinstance(msg, SensorPacket):
            _check_packet(msg)
        return msg
    except BadFrame:
        raise
    except Exception as e:   # bad JSON/UTF-8, wrong fields, deep nesting, ...
        raise BadFrame(f"malformed: {type(e).__name__}") from e


def _no_const(c):
    raise BadFrame("non-finite number")


def _check_packet(p: SensorPacket):
    def mat(m, cols=None):
        ok = isinstance(m, list) and m and all(isinstance(r, list) and r and len(r) == len(m[0]) for r in m)
        ok = ok and (cols is None or len(m[0]) == cols)
        if not ok or not all(isinstance(v, (int, float)) and not isinstance(v, bool) for r in m for v in r):
            raise BadFrame("bad array shape")
    mat(p.eeg); mat([p.ppg]); mat(p.imu, 6)
    if not (isinstance(p.fs_eeg, int) and isinstance(p.fs_ppg, int) and p.fs_eeg > 0 and p.fs_ppg > 0):
        raise BadFrame("bad fs")
    if not all(isinstance(v, (int, float)) for v in [p.t_start, *p.impedance]) or len(p.impedance) != len(p.eeg):
        raise BadFrame("bad scalar fields")
    if not isinstance(p.seq, int):
        raise BadFrame("bad seq")
