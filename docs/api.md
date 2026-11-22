# Core API (http://localhost:8000, WebSocket ws://localhost:8000/ws)
- WS /ws pushes the telemetry object ~4x per simulated step (fast-forwarded by `speed`).
- GET /state -> telemetry. Fields: t (s), state ("monitor"|"stim"|"cooldown"|"locked"|"safe_mode"), hr (bpm|null),
  hr_baseline (bpm|null), link_ok (bool: sensor link), lost (packets), lock_reasons (string[]), review_required (bool),
  stimulating (bool), stim ({amp_mA,freq_Hz,pw_us,duration_s,site,reason,cmd_id}|null), scenario (key), done (bool), speed.
- GET /events -> [{t, kind, detail}] kind: candidate|stim|reject|abort|lock|unlock|safe_mode|state
- GET /scenarios -> [{key,title}]; POST /scenario/{key}?speed=10 starts it (returns telemetry)
- GET /results -> [{key,title,pass}] (runs all 9 scenarios, ~2 s)
- POST /abort (manual ABORT; device then requires review); POST /clear_review
Rules: if the WS drops, show "Device autonomous" and never queue or send any stimulation command; ABORT is the only control besides scenario playback.
