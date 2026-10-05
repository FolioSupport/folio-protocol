# Folio roadmap

The roadmap is ordered by dependency, not by calendar. A phase starts when the one before it has shipped and its exit checks have passed. No dates are promised, because a date is a claim and this project prefers to publish claims it can keep.

## Phase 0: Foundations

* Public website with live chain data: newest block, total value locked and the busiest pairs on Robinhood Chain.
* A project register that records every external fact together with its state, so links, handles and addresses appear only when they are confirmed.
* Written protocol notes: whitepaper, tokenomics principles, architecture.
* Brand system sampled from the logo and illustration set.

Exit check: the site builds from the register alone, both branches of every record pass the gates, and the content security policy lists every origin the page uses.

## Phase 1: First tags

* Add-on for Chromium based browsers that recognises handles and token addresses on x.com.
* Account tags built from age, rename trail and promotion history.
* Contract tags built from creator record, launch structure and permission checks.
* Dossier panel with the evidence behind every tag.

Exit check: every tag shown can be traced to named evidence in its dossier, and the add-on works with no wallet connection of any kind.

## Phase 2: Depth

* Launch anatomy view: first buyers, funding trails, early sellers.
* Lookalike resolution for copycat symbols, with liquidity and age compared.
* Record of removed entries and what followed them.
* Dispute flow with written outcomes and a visible correction trail.

Exit check: a disputed tag can be corrected, and the correction leaves the earlier version readable.

## Phase 3: Openness

* Public repository for the add-on and the scoring rules, versioned so a tag can be matched to the rule set that produced it.
* Reproducible release builds with published checksums.
* Documented read-only interface for researchers and other tools.

Exit check: a third party can rebuild a release and obtain the published checksum.

## Phase 4: Protocol

* Publish the token design if and when one is announced, following the rules in the tokenomics notes.
* Dispute bonds and contributor rewards, if the token is adopted.
* Grants for builders on Robinhood Chain who extend the evidence set.

Exit check: every economic parameter is stated in the register and on the site before it takes effect.

## Always

Security review of every release, a public record of what each version changed, and a standing rule that the website only states what the register states.
