# Folio whitepaper

## 1. The problem

A social feed rewards the loudest voice, not the most reliable one. On X, a token address and a confident sentence travel together, and by the time a reader asks who is behind either, the moment has usually passed. The relevant facts exist: how old the account is, what it called before, which launches it touched, what happened to the people who followed. They sit in public records, scattered across explorers, archives and memory. Reading them takes several tabs and several minutes. The feed gives you seconds.

Folio closes that gap. It moves the background check to the point where the decision is made, so that context arrives with the claim instead of after the loss.

## 2. What Folio does

Folio is a browser add-on that runs on x.com. It reads what the page already loaded and looks for two kinds of subject.

* **Accounts.** Profile age, rename trail, promotion history and the pattern of earlier calls.
* **Contracts.** Who created an address, how it was launched, how early wallets were funded, whether permissions look standard, and which of several lookalike symbols holds the real liquidity.

For each subject it draws a single slim tag in one of three signal colours: red for likely danger, amber for caution, green for earned trust. The tag opens into a dossier that lists the evidence behind it. Entries that score as dangerous fade and carry a stamp. Addresses and cashtags are underlined by risk.

The product aims to answer one question quickly: should this claim be believed on its own, or does it need a closer look?

## 3. Principles

1. **Evidence before verdict.** A tag is a summary of facts a reader can inspect. If the dossier cannot show why, the tag does not appear.
2. **Public data only.** Folio reads information anyone can see. It never asks for a seed phrase, a signature or a login, and it cannot move funds.
3. **Uncertainty is shown.** Where data is thin the tag says so. A missing record is displayed as missing, never as safe.
4. **No hidden weighting for sale.** Placement and colour are never for sale. A tag changes only when evidence changes.
5. **Reversible.** Every tag can be disputed, and a corrected record replaces the old one with its history intact.

## 4. How a tag is produced

Scoring combines independent signals. No single signal decides a tag.

* **History signals** look backwards: account age, usernames held, deleted entries, outcomes of past promotions.
* **Structure signals** look at a launch: concentration of early buyers, shared funding sources, speed of exits, liquidity lock status, mint and ownership permissions.
* **Consistency signals** compare claims with records: a profile that describes itself as a builder is checked against public repositories and deployments.
* **Context signals** compare a symbol with its lookalikes on the same chain and surface the pair with the deepest and oldest liquidity.

Signals are grouped into the three colours. Red requires at least one structure or history signal of high severity. Green requires sustained positive evidence over time, and is never granted from a single good week.

## 5. Role of Robinhood Chain

Folio is built for Robinhood Chain, chain id 4663 (0x1237). The chain supplies the ground truth the add-on depends on: contract creation records, early transfers, liquidity events and the pair data aggregators publish. Block numbers shown on the website come from the chain's public RPC, and market figures come from public aggregators. Anchoring the product to one network keeps the evidence deep rather than shallow, and lets the heuristics be tuned to how launches actually behave there.

## 6. Privacy

The add-on processes the page locally and requests only public identifiers (a handle, an address) from Folio services. It does not collect browsing history, does not keep a profile of the reader, and does not transmit page content that does not contain a recognised subject. Requests carry no cookies. The source for every release is intended to be published so that these statements can be verified rather than trusted.

## 7. Governance and disputes

Tags are only as good as their correction process. A dispute names the subject, the tag and the evidence offered. Accepted disputes update the record and leave a visible trail. Rejected disputes receive a written reason. Rules for severity and for what counts as evidence are versioned and public, so a reader can see which version produced a given tag.

## 8. Limits

Folio is a reading aid, not an oracle. It cannot see private arrangements, it can be late on brand new accounts, and a careful bad actor can look clean for a time. Tags describe evidence, not intent. Nothing in the product or on the website is investment advice, and readers remain responsible for their own decisions.

## 9. Summary

The feed will keep rewarding noise. Folio does not try to silence it. It adds a quiet line of history under each claim, so that the cost of checking drops to zero and the cost of ignoring the record becomes a choice.
