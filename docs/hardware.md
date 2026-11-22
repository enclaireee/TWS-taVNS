# Hardware (demo: spec only, no code)

The earbud is a demo. Software treats it as a black box behind two messages (`tws/contract.py`):
`SensorPacket` in every 250 ms (EEG 3 ch @256 Hz, PPG + IMU @48 Hz, impedance, battery, faults), `StimCommand` / `Abort` out.
Framing: JSON + CRC32 trailer; `seq` gaps and late packets put the core in safe mode.

To plug in real hardware: implement `tws.link.Transport` (BLE or serial) and a stimulator driver with the same
`apply/abort/finish` interface as `tws.safety.stim.FakeStimulator`. Nothing else changes.

What the driver must deliver for a `StimCommand` (sources in [`research/`](research/), section 4):
- Charge-balanced, symmetric biphasic rectangular pulses; `pw_us` is the duration of each phase.
- Continuous pulses at `freq_Hz` for `duration_s`, then stop; `Abort` stops output within one pulse period.
- Set `Limits.electrode_area_cm2` in `tws/safety/stim.py` to the measured contact area of the cymba electrode. The limiter
  rejects any command over 2 mA/cm² r.m.s.; at the widest limits (5 mA, 500 µs, 30 Hz) that needs at least 0.433 cm².
- Report the stimulation electrode impedance; the EEG impedance gate (40 kΩ) assumes wet or gel contacts and needs
  a new value for dry electrodes.
