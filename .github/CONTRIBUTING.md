# Contributing to Folio

Thanks for taking the time. This guide covers the website and the written material in this repository.

## Ground rules

* Facts come from the register. If a link, handle, address or figure is not recorded in `register/records.mjs` with the state `stated`, it does not belong on the page.
* Copy lives in `src/copy.mjs`. Do not type visible text into the renderer or the scripts.
* Colour literals live in `src/tokens.css` only, and that file is written by `npm run assets`. If you need a new colour, add a sampled region to `tools/analyze-assets.mjs` rather than a hex value anywhere else.
* Pages must work without a pointer, without motion and at 360 pixels wide. Interactive elements keep a 44 by 44 pixel target.
* Do not add units that depend on font metrics for layout, and do not add inline scripts or inline styles: the content security policy forbids them.

## Setup

```
npm install
npm run build
npm run gates
```

The gates must pass before a change is proposed. They finish in a few seconds and need no network access.

## Making a change

1. Open an issue first for anything larger than a typo, so effort is not wasted.
2. Keep a change focused on one concern.
3. If you add behaviour, add or extend a gate that would fail without it. Gates use synthetic data and an injected clock; do not call real services from them.
4. If you add an external fact, add a record with a state. Write the gate for the absent branch first.
5. Run `npm run build` and `npm run gates` and include the result in the description.

## Writing style

Plain, specific and short. Say what a thing does, not how impressive it is. Do not state anything as confirmed unless it is in the register.

## Reporting security problems

Do not open a public issue. Follow `SECURITY.md`.

## Conduct

Be direct, be kind, assume good faith. Harassment and personal attacks end the conversation.
