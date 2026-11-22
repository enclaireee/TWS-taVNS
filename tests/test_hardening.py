"""Regression tests for the security review findings (malformed frames, stale detections, floors, caps)."""
import json, zlib
import pytest
from tws.contract import BadFrame, decode, encode, SensorPacket
from tws.safety.fsm import FsmConfig, StateMachine
from tws.safety.gate import GateResult, SafetyGate
from tws.sim.earbud import Scenario, Sim


def frame(obj):
    body = obj if isinstance(obj, bytes) else json.dumps(obj).encode()
    return body + zlib.crc32(body).to_bytes(4, "big")


good = dict(t_start=0.0, seq=0, fs_eeg=256, eeg=[[0.0] * 4] * 3, fs_ppg=48, ppg=[0.0] * 3, imu=[[0.0] * 6] * 3, impedance=[1, 1, 1])


@pytest.mark.parametrize("bad", [
    b"\xff\xfe", b"[1,2]", b"5", b'{"v":1,"type":"Abort","data":[]}',
    {"v": 1, "type": "SensorPacket", "data": {**good, "imu": []}},
    {"v": 1, "type": "SensorPacket", "data": {**good, "eeg": [1, 2, 3]}},
    {"v": 1, "type": "SensorPacket", "data": {**good, "eeg": [[1, 2], [3]]}},
    {"v": 1, "type": "SensorPacket", "data": {**good, "fs_eeg": 0}},
    b'{"v":1,"type":"SensorPacket","data":{"t_start":Infinity}}',
    b"[" * 5000,
])
def test_malformed_frames_raise_badframe(bad):
    with pytest.raises(BadFrame):
        decode(frame(bad))


def test_valid_packet_roundtrips():
    assert decode(frame({"v": 1, "type": "SensorPacket", "data": good})).seq == 0


def test_garbage_frames_do_not_keep_link_alive_or_crash():
    sim = Sim(Scenario("g", duration=100))
    while sim.t < 40:
        sim.step()
    for _ in range(80):                      # 20 s of CRC-valid junk instead of packets
        sim.link.send(frame(b'{"v":1,"type":"SensorPacket","data":{"eeg":[1]}}'), sim.t + 0.25)
        sim.ear.seq += 1
        sim.pl.tick(sim.t + 0.25); sim.t += 0.25
    assert not sim.pl.link_ok and sim.pl.last_gate.lock


def test_stale_detection_does_not_refire_after_packet_loss():
    sim = Sim(Scenario("l", duration=400, seizure=(70, 80), link=dict(loss=0.25)))
    while not sim.done:
        sim.step()
    assert len([e for e in sim.stim.log if e[1] == "apply"]) <= 1


def test_absolute_bradycardia_floor_locks_even_without_baseline():
    r = SafetyGate().evaluate(1.0, 25.0, True, False, False, [1, 1, 1])
    assert r.lock


def test_scheduled_stim_obeys_rate_cap():
    f = StateMachine(FsmConfig(scheduled_s=1, cooldown_s=0, max_per_hour=3))
    n = sum(1 for t in range(0, 40, 2) for a in f.step(t, False, GateResult(), True, scheduled_due=True) if hasattr(a, "amp_mA"))
    assert n == 3


def test_cooldown_owed_after_safe_mode_abort():
    f = StateMachine()
    f.step(0, True, GateResult(), True)                 # responsive stim starts
    f.step(5, False, GateResult(), False)               # link lost -> abort
    f.step(5.25, True, GateResult(), True)              # link back + candidate
    assert f.state.value == "cooldown"
