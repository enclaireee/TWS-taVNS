"""python -m tws demo [scenario]  -> print one scenario's event log
python -m tws serve           -> start the API on :8000"""
import sys

cmd = sys.argv[1] if len(sys.argv) > 1 else "demo"
if cmd == "serve":
    import uvicorn
    uvicorn.run("tws.api.server:app", port=8000)
elif cmd == "demo":
    from tws.sim.earbud import run
    from tws.sim.scenarios import SCENARIOS
    name = sys.argv[2] if len(sys.argv) > 2 else "seizure_clonic_normal_hr"
    title, scn, check = SCENARIOS[name]
    pl, st = run(scn)
    print(title)
    for e in pl.all_events:
        print(f"{e.t:7.1f}s  {e.kind:10s} {e.detail}")
    print("PASS" if check(pl, st) else "FAIL")
else:
    sys.exit(__doc__)
