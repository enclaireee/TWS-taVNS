"""The doc scenarios run through the full pipeline (sim -> link -> dsp -> detect -> safety -> fsm -> stim)."""
import pytest
from tws.sim.earbud import run
from tws.sim.scenarios import SCENARIOS


@pytest.mark.parametrize("key", SCENARIOS)
def test_scenario(key):
    title, scn, check = SCENARIOS[key]
    pl, st = run(scn)
    assert check(pl, st), title
