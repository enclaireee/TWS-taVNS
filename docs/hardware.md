# Hardware (demo: spec only, no code)

The earbud is a demo. Software treats it as a black box behind two messages (`tws/contract.py`):
`SensorPacket` in every 250 ms (EEG 3 ch @256 Hz, PPG + IMU @48 Hz, impedance, battery, faults), `StimCommand` / `Abort` out.
Framing: JSON + CRC32 trailer; `seq` gaps and late packets put the core in safe mode.

To plug in real hardware: implement `tws.link.Transport` (BLE or serial) and a stimulator driver with the same
`apply/abort/finish` interface as `tws.safety.stim.FakeStimulator`. Nothing else changes.

Open items before any real use (all PLACEHOLDER in code, marked `ponytail:`):
- Output limits in `tws/safety/stim.py` must come from IEC 60601-2-10 and a hardware current limiter that is independent of software.
- Impedance threshold, HR drop / recovery fractions in `tws/safety/gate.py` need tuning on real signals.
- Detector is a synthetic baseline; per-patient training on CHB-MIT temporal channels is not done yet.
No clinical claims. This repo is a software demo, not a medical device.
