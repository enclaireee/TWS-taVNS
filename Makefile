PY := .venv/bin/python
.PHONY: setup dev api web mobile demo test paper refs

setup:                     ## one-time: python venv + JS deps
	python3 -m venv .venv
	$(PY) -m pip install -q -e .
	cd apps/web && npm install
	cd apps/mobile && npm install

dev:                       ## API (:8000) + web dashboard (:3000) together
	$(MAKE) -j2 api web

api:                       ## simulated earbud + FastAPI/WebSocket
	$(PY) -m tws serve

web:                       ## Next.js dashboard
	cd apps/web && npm run dev

mobile:                    ## Expo app (set the API URL in-app to your machine's IP)
	cd apps/mobile && npx expo start

demo:                      ## print one scenario: make demo S=rapid_hr_drop
	$(PY) -m tws demo $(S)

test:                      ## all 9 scenarios + unit tests
	$(PY) -m pytest -q

paper:                     ## build docs/research/tws-tavns-evidence.pdf (TeX Live + biber)
	cd docs/research && latexmk -pdf -interaction=nonstopmode -halt-on-error tws-tavns-evidence.tex && latexmk -c tws-tavns-evidence.tex

refs:                      ## re-check every DOI in docs/research/references.bib against Crossref and PubMed (network)
	$(PY) docs/research/check_refs.py
