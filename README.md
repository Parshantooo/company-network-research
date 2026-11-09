# Company relationships and market risk

A research article and interactive historical company graph.

The site presents a 20-company slice of an existing research network. Readers can inspect relationship types, distinguish profile assertions from reviewed filing links, and trace a demand or supply scenario through one or two hops. The page is designed as a research article with an embedded working figure, rather than an application dashboard.

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
    graph-data.json       Curated historical relationship records
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
- Use neighborhood mode, keyboard node selection, and CSV export.
- Copy the page URL to preserve graph settings in the URL fragment.

All interactions run in the browser. There are no analytics, accounts, or external application requests. The only application fetch is the same-origin static graph JSON.

## Research boundaries

The data snapshot is October 20, 2026. The article design is November 9, 2026. This is a historical research graph, not a current supplier database or a return forecast.

Most edges are retrospectively authored profile assertions intended to describe 2010-era structure. The Apple/Intel filing mentions remain candidates for a direct purchasing relationship. Two distinct parent-level pairs in the Delta regional-capacity pilot are locally reviewed. That small rule-development sample does not establish generalization.

Scenario tracing is unweighted breadth-first reachability, not a causal model or an exposure calculation. Dates record disclosures rather than contract inception. See the source notes for the full provenance and limits.

## Design reference and font rights

The layout follows the editorial structure of [Optiver's research blog](https://www.optiver.com/insights/technology-blog/machine-learning-in-trading-an-adversarial-research-problem/): serif headline, restrained metadata, introduction, feature illustration, section navigation, and readable article column. The page uses project-specific text and illustrations; it is not affiliated with Optiver.

The inspected reference uses Roboto body text and Century Expanded LT Std headlines. This project self-hosts open-source Roboto and Libre Baskerville. Headline CSS uses a locally installed Century font when available and otherwise the bundled Libre Baskerville fallback. Optiver's commercial headline files, custom Opticode, branding, article copy, and imagery are not included. Font license texts ship with the project.

## Checks

```sh
python3 scripts/package_source.py
python3 scripts/check_site.py
node --check dist/assets/explorer.js
```

The source archive excludes Git metadata, Sites identity, credentials, and raw licensed research panels. The included graph export is the complete dataset needed by the website.

