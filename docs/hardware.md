# Hardware (demo: spec only, no code)

The earbud is a demo. Software treats it as a black box behind two messages (`tws/contract.py`):
`SensorPacket` in every 250 ms (EEG 3 ch @256 Hz, PPG + IMU @48 Hz, impedance, battery, faults), `StimCommand` / `Abort` out.
Framing: JSON + CRC32 trailer; `seq` gaps and late packets put the core in safe mode.

To plug in real hardware: implement `tws.link.Transport` (BLE or serial) and a stimulator driver with the same
`apply/abort/finish` interface as `tws.safety.stim.FakeStimulator`. Nothing else changes.
