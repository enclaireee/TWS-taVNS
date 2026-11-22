"""Re-check every DOI in references.bib: does it resolve, and do year / volume / first page match PubMed?

    python docs/research/check_refs.py          (or: make refs)

Needs network access. Prints one line per entry and exits non-zero if a DOI fails to resolve or a field disagrees.
Entries without a DOI (standards, regulations, web pages, the thesis) are listed as "no DOI" and checked by hand.
"""
from __future__ import annotations
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BIB = Path(__file__).with_name("references.bib")
UA = {"User-Agent": "tws-tavns-refcheck/1.0"}


def get_json(url: str):
    for attempt in range(6):
        time.sleep(0.4)                       # NCBI allows 3 requests/s without an API key
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503):
                time.sleep(2 * (attempt + 1))
                continue
            raise
    raise RuntimeError(f"gave up on {url}")


def resolves(doi: str) -> bool:
    req = urllib.request.Request("https://doi.org/" + urllib.parse.quote(doi), headers=UA, method="HEAD")
    opener = urllib.request.build_opener(_NoRedirect)
    try:
        opener.open(req, timeout=60)
    except urllib.error.HTTPError as e:
        return e.code in (301, 302, 303, 307, 308)
    return True


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


def entries(text: str):
    for m in re.finditer(r"@(\w+)\{(\w+),(.*?)\}\s*(?=\n@|\Z)", text, re.S):
        yield m.group(2), m.group(3)


def field(body: str, name: str) -> str:
    m = re.search(name + r"\s*=\s*\{([^}]*)\}", body, re.I)
    return m.group(1) if m else ""


def main() -> int:
    bad = 0
    for key, body in entries(BIB.read_text()):
        doi = field(body, "doi")
        if not doi:
            print(f"{key:18s} no DOI (check by hand: {field(body, 'url')})")
            continue
        if not resolves(doi):
            print(f"{key:18s} DOI DOES NOT RESOLVE: {doi}")
            bad += 1
            continue
        ids = get_json("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&term="
                       + urllib.parse.quote(doi + "[doi]"))["esearchresult"]["idlist"]
        if not ids:
            print(f"{key:18s} resolves; not indexed in PubMed")
            continue
        x = get_json("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id="
                     + ids[0])["result"][ids[0]]
        diffs = []
        year = x.get("pubdate", "")[:4]
        if year != field(body, "year"):
            diffs.append(f"year bib {field(body, 'year')} / PubMed {year} (online vs issue year can differ)")
        vol = x.get("volume", "")
        if vol and vol.split()[0] != field(body, "volume"):
            diffs.append(f"volume bib {field(body, 'volume')} / PubMed {vol}")
        pm_first = x.get("pages", "").split("-")[0].lower()
        bib_first = (field(body, "pages") or field(body, "eid")).replace("–", "-").split("-")[0].lower()
        if pm_first and pm_first != bib_first:
            diffs.append(f"first page bib {bib_first or '-'} / PubMed {pm_first}")
        print(f"{key:18s} PMID {ids[0]:9s} " + ("OK" if not diffs else "CHECK: " + "; ".join(diffs)))
        bad += bool(diffs) and not all(d.startswith("year") for d in diffs)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
