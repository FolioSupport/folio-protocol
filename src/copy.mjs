// Every visible sentence on the page lives here. Branch-dependent lines are functions of the resolved register.
export const meta = {
  title: 'Folio | Background checks for your X feed',
  description: 'Folio is a browser add-on that profiles usernames and token addresses met on X, tagging each as builder, trader, promoter or rug risk. Made for Robinhood Chain.',
  ogAlt: 'Painted meadow scene featuring a herder, sheep and one hungry predator, beside the Folio mark.',
};

export const nav = [
  ['#story', 'Why Folio'],
  ['#overview', 'Overview'],
  ['#signals', 'Signals'],
  ['#network', 'Network'],
  ['#install', 'Install'],
  ['#faq', 'FAQ'],
];

export const hero = {
  pillLabel: 'Robinhood Chain',
  h1: ['Look behind', 'the handle'],
  sub: 'Folio is a browser add-on for X. It profiles each author and token address passing by, then tags them as builder, trader, promoter or rug risk. No second tab, no copy and paste.',
  ctaInstall: 'Add to browser',
  ctaSee: 'Watch it work',
  stageUrl: 'x.com/home',
  stageNote: 'Names, messages and tags here are invented for illustration. Nobody real appears.',
};

export const stage = {
  tabs: ['Highlights', 'Followed'],
  posts: [
    { initial: 'L', tone: 'ok', name: 'Lantern Works', handle: '@lantern_works', text: 'Router audit fixes shipped today. Changes are open for review, tests pass.', tag: 'Builder', why: 'Open commits, steady history' },
    { initial: 'M', tone: 'bad', name: 'Marrow', handle: '@marrow_calls', text: 'Final warning before liftoff. Ape now, ticker $HOLLOW, details in profile.', tag: 'Rug risk', why: 'Launcher dumped on earlier buyers' },
    { initial: 'V', tone: 'warn', name: 'Vesper', handle: '@vesper_desk', text: 'Fresh branding, same conviction. Stacking $PLUME on every dip.', tag: 'Caution', why: 'Username swapped three times' },
    { initial: 'K', tone: 'ok', name: 'Kestrel', handle: '@kestrel_labs', text: 'Vault module docs are published. Questions welcome below.', tag: 'Builder', why: 'Maintains open repositories' },
  ],
  side: {
    search: 'Search',
    title: 'Dossier',
    rows: [['Profile age', 'Seasoned'], ['Usernames', 'Several'], ['Promos', 'Frequent'], ['Launcher', 'Flagged']],
  },
};

export const tiles = {
  chain: 'Chain',
  contract: 'Contract',
  rpc: 'RPC',
  chainSub: 'Network id',
  contractSub: 'Official address',
  rpcSub: 'Public endpoint',
  copy: 'Copy',
  copied: 'Copied',
};

export const story = {
  eyebrow: 'Why Folio',
  h2: 'One boy, one predator, and a feed full of sheep.',
  p: 'The painting behind our banner is an old warning about false alarms. Timelines replay it hourly: one loud voice, one stampede, with nobody asking who started it.',
  pages: [
    { k: 'I', title: 'Loud voice', text: 'A stranger swears their coin is about to soar. Heads turn. Few ask who is shouting, or how earlier alarms ended.' },
    { k: 'II', title: 'Predator', text: 'Plenty of hype hides a launcher address with habits. It starts coins, sells into stampedes, then resurfaces wearing another name.' },
    { k: 'III', title: 'Herd instinct', text: 'Crowds move together because going solo feels slow. History placed beside claims gives every reader reason to pause.' },
  ],
  caption: ['Plate I', 'Plate II', 'Plate III'],
  prev: 'Back',
  next: 'Forward',
  label: 'Chapter',
  moralEyebrow: 'Takeaway',
  moral: 'Alarms are cheap, receipts are not. Folio keeps receipts within reach, so each alarm shows up with its history attached.',
};

export const overview = {
  eyebrow: 'Second opinion',
  h2: 'Scroll with homework already done.',
  p: 'Folio runs within x.com. Under anything crypto-flavoured it draws one slim tag in a signal colour: red means likely danger, amber means caution, green means earned trust. Tap any tag to reveal its evidence.',
  ticks: [
    'Dangerous entries fade and wear a clear stamp',
    'Addresses and cashtags get risk underlines',
    'Every bio gains a dossier panel',
  ],
  figTitle: 'Crying wolf, repainted',
  figText: 'Alarms cost nothing. History costs years.',
};

export const cards = {
  h2: 'One add-on, four habits.',
  p: 'Everything happens inside whatever tab you already opened.',
  items: [
    { kind: 'pulse', title: 'Fresh blocks, as they land.', text: 'Folio keeps a heartbeat on Robinhood Chain. Newest blocks tell you when tokens land on a network that is genuinely moving.', art: 'Plate IV', artText: 'Keep moving.', feedTitle: 'Newest blocks' },
    { kind: 'launch', title: 'First buyers, and whoever funded them.', text: 'Launch-day wallets get scrutiny. Fresh addresses topped up by one sender look like a cluster, never a crowd.', art: 'Plate V', artText: 'Count footprints.', feedTitle: 'Early wallets', rows: [['Fresh addresses', 'Many'], ['Single sender', 'Found'], ['Quick exits', 'Seen']], foot: 'One sender behind them' },
    { kind: 'names', title: 'Renames do not erase the past.', text: 'Past usernames stay listed together, so fresh branding drags earlier ones along.', art: 'Plate VI', artText: 'Plumage fades.', feedTitle: 'Rename trail', rows: [['@glint_dao', 'Now'], ['@glint_labs', 'Before'], ['@glintfi', 'Origin']] },
    { kind: 'depth', title: 'Liquidity, glanced.', text: 'A compact panel shows where trading is busiest across Robinhood Chain, using public market data.', art: 'Plate VII', artText: 'Follow volume.', feedTitle: 'Volume per pair, 24h' },
  ],
};

export const signals = {
  h2: 'What Folio inspects.',
  p: 'Five lenses, each opening as its own panel from any tag.',
  tabs: [
    {
      key: 'accounts', label: 'Accounts', title: 'Who is speaking',
      text: 'Profile age, rename trail, earlier promotions and how often one claim gets recycled. Confident voices with thin records get noticed.',
      list: ['Rename trail', 'Promo history', 'Audience quality'],
      tag: ['Caution', 'warn'], line: 'Username swapped three times',
      rows: [['Profile age', 'Seasoned'], ['Usernames', 'Several'], ['Last promo', 'Recent']],
    },
    {
      key: 'contracts', label: 'Contracts', title: 'What this code does',
      text: 'Who created it, how it was born, and whether the code is standard or hides odd permissions.',
      list: ['Creator record', 'Birth pattern', 'Permission checks'],
      tag: ['Rug risk', 'bad'], line: 'Minting is unrestricted',
      rows: [['Creator', 'Flagged'], ['Mint rights', 'Open'], ['Liquidity', 'Unlocked']],
    },
    {
      key: 'launches', label: 'Launches', title: 'How tokens begin',
      text: 'Opening minutes reveal most: early entrants, how those addresses got funded, and who dumped on buyers.',
      list: ['Early buyers', 'Funding trails', 'Early sellers'],
      tag: ['Caution', 'warn'], line: 'Wallets share one sender',
      rows: [['Buyers', 'Clustered'], ['Sender', 'Shared'], ['Exits', 'Quick']],
    },
    {
      key: 'tickers', label: 'Cashtags', title: 'Which symbol is genuine',
      text: 'Copycat symbols multiply quickly. Folio lines up lookalikes so you can spot which contract carries genuine liquidity.',
      list: ['Lookalike symbols', 'Depth comparison', 'Age per pair'],
      tag: ['Trusted', 'ok'], line: 'Deepest liquidity, oldest pair',
      rows: [['Candidates', 'Several'], ['Best match', 'Found'], ['Copycats', 'Listed']],
    },
    {
      key: 'history', label: 'Deleted', title: 'What quietly vanished',
      text: 'Calls that vanish after failing remain part of history. Folio keeps a pointer to whatever was removed.',
      list: ['Removed entries', 'Removal timing', 'Aftermath'],
      tag: ['Caution', 'warn'], line: 'Several entries removed',
      rows: [['Removed', 'Several'], ['Timing', 'After drop'], ['Pattern', 'Repeats']],
    },
  ],
  popupTitle: 'Folio',
  popupLive: 'Reading',
  urlPill: 'x.com/home',
  stagedNote: 'Staged example. Tags and rows are illustrative.',
  tablist: 'Signals',
};

export const network = {
  eyebrow: 'On chain',
  h2: 'Chain data, live.',
  p: 'Figures arrive straight from public endpoints and keep refreshing while this tab stays open.',
  stats: [
    ['block', 'Newest block', 'Chain RPC'],
    ['tvl', 'Value locked', 'DefiLlama'],
    ['pairs', 'Pairs listed', 'DexScreener'],
    ['volume', 'Top pairs volume, 24h', 'DexScreener'],
  ],
  boardTitle: 'Busiest pairs on Robinhood Chain',
  boardSub: 'Ranked by 24 hour volume',
  vol: 'Vol 24h',
  retry: 'Market feed unreachable. Trying again shortly.',
  sources: 'Sources: chain RPC, DefiLlama, DexScreener. Informational only, never advice.',
  statuses: { live: 'Live', connecting: 'Connecting', offline: 'Offline' },
  block: 'Block',
};

export const install = {
  h2: 'Get Folio.',
  p: (r) => (r.install.state === 'stated'
    ? 'The download exists. Pin it beside your toolbar.'
    : 'No link has been announced, so there is zero to fetch yet. The button below stays dark until one exists.'),
  price: '—',
  priceSub: 'Pricing',
  ticks: [
    'Tags, dossier panels and stamps on X',
    'Address and cashtag scans',
    'Made for Robinhood Chain',
  ],
  formTitle: 'Folio add-on',
  specs: [['Version', 'version'], ['Size', 'size'], ['Checksum', 'checksum']],
  specNote: 'Build details appear here once a release exists.',
  btnInstall: 'Add to browser',
  btnSource: 'Source code',
  btnX: 'Follow on X',
  finePrint: 'Copy addresses only from the bar pinned above.',
};

export const faq = {
  h2: 'Questions',
  p: (r) => (r.x.state === 'stated' ? 'Something missing? Ask on X and replies come out in the open.' : 'Something missing? A contact channel will be listed here once announced.'),
  items: (r) => [
    ['What does Folio do?', 'It watches the X tab in front of you, spots usernames and token addresses, and pins a short tag that explains itself. Fewer blind clicks.'],
    ['Will it go near my funds?', 'No. Folio reads only what anyone can see. Nothing about it needs keys, signatures or recovery words, and anything that requests those is lying.'],
    ['Which network does it follow?', `${r.chain.name}, chain id ${r.chain.id}. Block numbers here are fetched from the network's own public RPC.`],
    ['Where is the genuine token?', r.contract.state === 'stated'
      ? 'Look at the bar pinned above. That string is the official one; anything else is unverified.'
      : 'Nothing has been announced. Until a string appears in the bar pinned above, consider every address you are sent unverified.'],
    ['Is the code open?', r.github.state === 'stated'
      ? 'Yes. The repository sits behind the header icon.'
      : 'No repository has been announced. The header icon becomes clickable the second one exists.'],
    ['Are tags investment advice?', 'No. Tags are signals with evidence attached. They never replace your own judgment, and they can be wrong.'],
  ],
};

export const end = {
  h2: 'Check first. Click second.',
  btnInstall: 'Add to browser',
  btnX: 'Follow on X',
};

export const foot = {
  note: 'Folio is independent and has no tie to the company behind X.',
  links: [['#overview', 'Overview'], ['#faq', 'FAQ'], ['#install', 'Install']],
  docs: 'Docs',
};

export const labels = {
  ca: 'Contract',
  caCopy: 'Copy full address',
  copied: 'Copied',
  skip: 'Skip to content',
  social: 'Social links',
  xLabel: 'Folio on X',
  ghLabel: 'Folio GitHub',
  progress: 'Reading progress',
  health: 'Chain status',
};
