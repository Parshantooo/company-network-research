# Company relationships and market risk

A research article and interactive historical company graph.

Explore 477 historical companies directly in the browser: the saved 475-company research universe plus two counterparties from the filing pilot. The full network opens first, with company search, pan and zoom, sector filters, a neighborhood view, evidence inspection and directional path tracing. No download or account is needed.

The export contains 36,111 unique typed relationships from 67,184 original rows. Named profile assertions and filing records are shown by default. A separate filter includes inferred candidates generated from shared business tags. These are research hypotheses, not verified commercial relationships.

## Run locally

Python 3 is enough. No package installation, API key, or external data service is required.

```sh
python3 -m http.server 8080 --directory dist
```

Open [localhost:8080](http://localhost:8080). Serve over HTTP; direct file opening can block the graph's JSON fetch.

## Publish on GitHub Pages

This repository includes `.github/workflows/pages.yml`.

1. Create an empty GitHub repository and push these project files to its `main` branch.
2. In the repository, select **Settings → Pages → Source → GitHub Actions**.
3. Run the **Publish research site** workflow, or push a new commit to `main`.

The workflow packages the source download, checks the data and links, and deploys `dist/`. The site uses relative paths and works under a repository subpath such as `username.github.io/company-network-research/`.

For an exported project that does not yet have a Git repository:

```sh
git init -b main
git add .
git commit -m "Add company relationship research site"
# Add the URL of your own GitHub repository:
git remote add origin YOUR_REPOSITORY_URL
git push -u origin main
```

In the original working checkout, the `origin` remote belongs to the private Sites source host. Use the clean source ZIP to create the separate GitHub repository, or add a second remote named `github`; do not accidentally push to the wrong host.

Official reference: [Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Project layout

```text
dist/
  index.html              Research article and explorer
  source-notes.html       Data provenance, limits, and implementation
  assets/
    article.css           Self-hosted typography and responsive layout
    explorer.js           Graph filtering, evidence inspection, and tracing
    graph-data.json       477 companies and 36,111 historical relationships
    fonts/                Roboto, Libre Baskerville, and OFL licenses
scripts/
  check_site.py           Data integrity and static-link checks
  package_source.py       Sanitized downloadable project archive
.github/workflows/
  pages.yml               GitHub Pages publishing workflow
```

## Interactions

- Find companies by ticker or name.
- Filter supply, competitor, shared-driver, and input-cost relationships.
- Filter all assertions, records with filing evidence, or reviewed links only.
- Follow customer-demand paths toward suppliers or supplier-disruption paths toward customers.
- Inspect disclosure dates and open SEC source filings.
- Use full-network and neighborhood views, pan, zoom, sector filters, accessible company selection, and optional CSV export.
- Copy the page URL to preserve graph settings in the URL fragment.

All interactions run in the browser. There are no analytics, accounts, or external application requests. The only application fetch is the same-origin static graph JSON.

## Research boundaries

The data snapshot is October 20, 2026. The interface was updated November 9, 2026. The site is interactive but the dataset does not update automatically. This is a historical research graph, not a current supplier database or a return forecast.

Most edges are retrospectively authored profile assertions intended to describe 2010-era structure. The Apple/Intel filing mentions remain candidates for a direct purchasing relationship. Two distinct parent-level pairs in the Delta regional-capacity pilot are locally reviewed. That small rule-development sample does not establish generalization.

Scenario tracing is unweighted breadth-first reachability, not a causal model or an exposure calculation. Dates record disclosures rather than contract inception. See the source notes for the full provenance and limits.

## Typography and font rights

Roboto and Libre Baskerville are self-hosted with their SIL Open Font License texts. No remote fonts are requested.

## Rebuild the data

The ready-to-use JSON is included. To regenerate it from the original research workspace:

```sh
python3 scripts/build_graph.py --workspace /path/to/research-workspace
```

The builder reads `stock_graph/profiles_ext.py` and `stock_graph/results/options_graph_5y/analysis_edges.csv`, removes reverse supply rows, deduplicates symmetric relationships, and retains the filing-pilot records already in the JSON. It does not read price panels or option quotes. See the source notes for evidence limitations.

## Checks

```sh
python3 scripts/package_source.py
python3 scripts/check_site.py
node --check dist/assets/explorer.js
```

The source archive excludes Git metadata, Sites identity, credentials, and raw licensed research panels. The included graph export is the complete dataset needed by the website.

