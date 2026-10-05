# Folio architecture

This note covers two things: the system the product is designed around, and the static website in this repository, which is the only part that exists today.

## 1. Product system

```
x.com page ──► content script ──► subject finder ──► background worker ──► Folio services
                    ▲                                        │                  │
                    └───────────── tag + dossier ◄───────────┘                  ▼
                                                                    chain RPC · indexers · caches
```

### Content script

Runs inside x.com. It watches the page for newly rendered entries, extracts public identifiers (handles and 20 byte addresses) and hands them to the background worker. It also draws the output: the slim tag, the stamp on dangerous entries, the underline on addresses and cashtags, and the dossier panel under a profile. It never reads form fields and never touches anything that looks like a credential.

### Subject finder

A small pure module that turns page text into subjects. Addresses are matched by shape (`0x` plus forty hexadecimal digits, any letter case) and checked against checksum rules where the casing allows it. Other `0x` values, such as chain ids or transaction selectors, are not treated as addresses and are not rejected as noise either; they are simply not subjects.

### Background worker

Batches subjects, de-duplicates them within a short window, and asks Folio services for records. It keeps a bounded local cache so that scrolling past the same account twice costs nothing. Requests carry no cookies and no page content beyond the identifier.

### Folio services

* **Record service.** Returns the signals and the evidence for a subject, stamped with the rule version that produced them.
* **Chain indexer.** Follows Robinhood Chain (chain id 4663) and stores contract creations, early transfers, liquidity events and ownership changes.
* **History archive.** Stores account level facts such as usernames held and removed entries, with timestamps.
* **Dispute store.** Holds disputes, outcomes and the corrected records, keeping every earlier version.

### Scoring

Signals are computed independently and combined by a versioned rule set into a colour. Every colour carries the list of signals that produced it; the dossier renders exactly that list.

## 2. Website

The site is static. It is produced by `tools/build.mjs` and written to `dist/`.

```
register/records.mjs ─► register/resolve.mjs ─┐
src/copy.mjs ─────────────────────────────────┤
src/page.mjs  (pure renderer) ◄───────────────┘ ─► dist/index.html
src/styles.css + src/tokens.css ─► dist/css/app.css
src/js/*.js, src/js/live/*.mjs   ─► dist/js/*
brand/, reference/ ─► tools/images.mjs ─► dist/img, favicon, touch icon
```

### Register and resolver

Every external fact is a record with a state. The resolver validates the records and returns the public model the renderer is allowed to use: values and links only for stated records, handles derived from stored URLs, bookkeeping fields removed.

### Renderer

`src/page.mjs` is a pure function of the resolved register, the copy and the traced logo geometry. It writes no inline script, inline style or event attribute, so the page runs under a strict content security policy. Elements that depend on a record carry `data-record` and `data-state`, which is what the gates look for.

### Live data

`src/js/live/` holds the logic that talks to the outside world, written without any DOM dependency so it can be exercised on a fake clock.

* `backoff.mjs`: exponential backoff with jitter and a poller that stops scheduling while the tab is hidden.
* `sources.mjs`: parsers for the RPC reply, the DefiLlama chain list (matched on chain id) and the DexScreener search result (filtered to pairs tagged `robinhood`).
* `health.mjs`: the Live, Connecting and Offline state machine.
* `format.mjs` and `countup.mjs`: number formatting that falls back to a dash, and the count-up curve.

### Colour and imagery

`tools/analyze-assets.mjs` reads every asset byte by byte: PNG header fields, JPEG frame header, alpha histogram, dominant pixels. It writes the palette with provenance. The logo with transparency contains pure black transparent pixels, so every resize of it uses a premultiplied path. The favicon is traced from the logo's real pixel grid.

### Security

`dist/_headers` carries the content security policy and companion headers. The policy is derived from the same list of endpoints the page uses, so adding an endpoint without allowing it, or allowing one that is not used, shows up as a gate failure.

### Gates

`tools/gates.mjs` runs in seconds. It builds the site from synthetic registers, flips every record using the state it finds at run time, and checks the rendered output, the live logic and the repository rules.
