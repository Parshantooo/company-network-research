# Design reference

Inspected November 9, 2026:

- https://www.optiver.com/insights/
- https://www.optiver.com/insights/technology-blog/machine-learning-in-trading-an-adversarial-research-problem/
- The public article's linked `dist-client/main.css`.

Observed structure: rounded navigation, breadcrumbs, large regular serif headline, category and date, short introduction, feature illustration, section navigation, a readable article column, and source/related content toward the end.

Observed font definitions: Roboto for body; Century Expanded LT Std for headlines. The implementation uses self-hosted open-source Roboto. It names locally available Century fonts before self-hosted Libre Baskerville in the headline fallback stack. No commercial font files are redistributed.

The design uses the same broad navy, cool-gray, and purple language. All site identity, research copy, diagram artwork, data, and interaction code are project-specific. No Optiver logo, custom Opticode assets, photos, or article text are bundled.

Font distribution sources:

- https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Libre+Baskerville:wght@400;700&display=swap
- https://github.com/google/fonts/tree/main/ofl/roboto
- https://github.com/google/fonts/tree/main/ofl/librebaskerville

The Google Fonts stylesheet supplied the public font file URLs. The corresponding OFL texts are included next to the font files.
