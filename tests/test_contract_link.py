import pytest
from tws.contract import SensorPacket, StimCommand, Abort, encode, decode, BadFrame
from tws.link import SimLink


def pkt(seq):
    return SensorPacket(t_start=seq * 0.25, seq=seq, fs_eeg=500, eeg=[[0.0] * 4] * 3, ppg=[0.0] * 3, imu=[[0.0] * 6] * 3, impedance=[1, 1, 1])


def test_roundtrip():
    for m in (pkt(3), StimCommand(1.0, 25, 250, 30, "cymba_left", "responsive", 7), Abort(7, "manual")):
        assert decode(encode(m)) == m


def test_corrupt_frame_rejected():
    f = bytearray(encode(pkt(1)))
    f[10] ^= 0xFF
    with pytest.raises(BadFrame):
        decode(bytes(f))


def test_simlink_deterministic_and_lossy():
    def run():
        l = SimLink(loss=0.3, delay=0.05, jitter=0.1, seed=42)
        for i in range(100):
            l.send(encode(pkt(i)), i * 0.25)
        return [decode(f).seq for f in l.poll(1e9)]
    a = run()
    assert a == run() and 50 < len(a) < 90


def test_simlink_delay_holds_packet():
    l = SimLink(delay=1.0)
    l.send(encode(pkt(0)), 0.0)
    assert l.poll(0.5) == [] and len(l.poll(1.0)) == 1
