# Folio

Folio is a browser add-on for X that puts a background check next to the accounts and token addresses you meet while scrolling. Every profile it recognises gets a slim tag (builder, trader, promoter, rug risk) and a dossier that explains the tag. It is built for Robinhood Chain.

This repository holds the public website for Folio, served from `folio.support`, together with the written material that describes the protocol: the whitepaper, tokenomics, roadmap and architecture notes in `docs/`.

## What is here

| Path | Purpose |
| --- | --- |
| `register/` | One record per external fact (chain, RPC, contract, X, GitHub, install link). Each carries a state: `stated`, `absent` or `unconfirmed`. |
| `src/` | Page source: copy, markup renderer, stylesheet, client scripts, colour tokens. |
| `tools/` | Asset analysis, image pipeline, build, local server and the gates. |
| `brand/`, `reference/` | Logo files and the illustrated boards the palette is sampled from. |
| `dist/` | Build output. This folder is what gets deployed. |
| `docs/` | Whitepaper, tokenomics, roadmap, architecture. |

## Commands

```
npm install
npm run assets   # reads every file in brand/ and reference/, rewrites src/palette.json and src/tokens.css
npm run build    # writes dist/
npm run gates    # builds synthetic variants and checks the rules; exits non-zero on any failure
npm run serve    # serves dist/ with the production headers on http://localhost:4173 (PORT to change)
```

## Deploying

Drag the `dist/` folder into Cloudflare Pages. Security headers, including the content security policy, ship in `dist/_headers`; the same policy is repeated in a meta tag as a fallback.

## How facts reach the page

Nothing on the page is typed in twice. A fact lives in `register/records.mjs` and is resolved by `register/resolve.mjs`:

* A **stated** record may render its value and its link.
* An **absent** or **unconfirmed** record renders its label only. The control stays on screen and inert, so the layout never shifts when a fact arrives.
* Links are stored as URLs and handles are derived from them. There is no handle field to drift out of sync.
* Dates and sources recorded against a fact stay in the register. They are stripped before rendering, and a gate fails the build if one reaches the output.

Flipping a record from absent to stated is the only edit needed to switch a control from inert to live. The gates exercise both branches of every record with synthetic values.

## Colour

The palette is sampled, not chosen. `npm run assets` runs k-means over regions of the artwork, snaps each centroid to a real pixel and writes the coordinates beside the hex in `src/palette.json`. `src/tokens.css` is the only source file allowed to contain a colour literal; everything else refers to a custom property.

## Live data

The page talks to three public endpoints and nothing else:

* the chain RPC for the newest block number,
* DefiLlama for total value locked, matched on chain id 4663,
* DexScreener for pairs tagged `robinhood`.

Polling backs off exponentially with jitter after failures, sleeps while the tab is hidden, and falls back to a dash when a source is unreachable.

## Licence

MIT. See `LICENSE`.
