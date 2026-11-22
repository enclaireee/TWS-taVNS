# Research: evidence review and parameter audit

[`tws-tavns-evidence.pdf`](tws-tavns-evidence.pdf) checks every numeric parameter in `tws/` against the literature:
where each value comes from, which values were changed to match the evidence, and which are design choices with no
direct source.

| File | What it is |
|---|---|
| `tws-tavns-evidence.tex` | LaTeX source |
| `references.bib` | 53 references; DOI entries are the registries' own BibTeX, cross-checked against PubMed |
| `tws-tavns-evidence.pdf` | Built document (14 pages) |
| `check_refs.py` | Re-checks every DOI and the year, volume and first page against PubMed |

```bash
make paper   # build the PDF (needs TeX Live with biber)
make refs    # re-check the references (needs network)
```

Appendix A of the PDF records, for each source, whether its numbers were read in the full text, the abstract, a named
secondary table, a public preview, or are metadata only.
