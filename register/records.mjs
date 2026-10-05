// REGISTER: one record per external fact.
// state: 'stated' | 'absent' | 'unconfirmed'. Only 'stated' records may render a link or a value.
// asOf / source / level are bookkeeping. They stay in this file and never reach the page.
export const STATES = ['stated', 'absent', 'unconfirmed'];

export const records = {
  chain: {
    state: 'stated',
    name: 'Robinhood Chain',
    id: 4663,
    idHex: '0x1237',
    source: 'client statement',
    asOf: '2026-09-02',
    level: 'batch',
  },
  rpc: {
    state: 'stated',
    url: 'https://rpc.mainnet.chain.robinhood.com',
    source: 'client statement',
    asOf: '2026-09-02',
    level: 'batch',
  },
  contract: {
    state: 'absent',
    address: null,
    source: null,
    asOf: null,
  },
  x: {
    state: 'stated',
    url: 'https://x.com/folio_support',
    source: 'client statement',
    asOf: '2026-10-05',
  },
  github: {
    state: 'absent',
    url: null,
    source: null,
    asOf: null,
  },
  site: {
    state: 'stated',
    host: 'folio.support',
    source: 'client statement',
    asOf: '2026-10-05',
  },
  install: {
    state: 'absent',
    url: null,
    source: null,
    asOf: null,
  },
};
