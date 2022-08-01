export const STORE_PORT = 'SYSCOIN';

export const SYS_NETWORK: {
  [networkId: string]: {
    beUrl: string;
    id: string;
    label: string;
  };
} = {
  main: {
    id: 'main',
    label: 'Mainnet',
    beUrl: 'https://blockbook.elint.services/',
  },
  testnet: {
    id: 'testnet',
    label: 'Testnet',
    beUrl: 'https://blockbook-dev.elint.services/',
  },
};

export const ETH_NETWORK: {
  [networkId: string]: {
    beUrl: string;
    id: string;
    label: string;
  };
} = {
  main: {
    id: 'main',
    label: 'Mainnet',
    beUrl: 'https://blockbook.elint.services/',
  },
  testnet: {
    id: 'testnet',
    label: 'Testnet',
    beUrl: 'https://blockbook-dev.elint.services/',
  },
};

export const ASSET_PRICE_API =
  'https://blockbook.elint.services/api/v2/tickers/';
export const SYS_EXPLORER_SEARCH = 'https://blockbook-dev.elint.services/';

export const PRICE_SYS_ID = 'syscoin';
export const PRICE_BTC_ID = 'bitcoin';
export const PRICE_ETH_ID = 'ethereum';

export const DEFAULT_CURRENCY = {
  id: 'usd',
  symbol: '$',
  name: 'USD',
};
