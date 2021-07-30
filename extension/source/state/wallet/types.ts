import { Transaction, Assets } from '../../scripts/types';

export interface IAccountState {
  address: { [assetId: string]: string };
  assets: Assets[];
  balance: number;
  connectedTo: any[];
  id: number;
  isTrezorWallet: boolean;
  label: string;
  transactions: Transaction[];
  trezorId?: number;
  xprv: string;
  xpub: string;
}

export interface IAccountUpdateState {
  assets: Assets[],
  balance: number;
  id: number;
  transactions: Transaction[];
}

export interface IAccountUpdateAddress {
  address: { [assetId: string]: string };
  id: number;
}

export interface IAccountUpdateXpub {
  id: number;
  xprv: string;
  xpub: string;
}

export interface Holding {
  assetGuid: string;
  balance: number;
  baseAssetID: string;
  decimals: number;
  description: string;
  nftAssetID: string;
  symbol: string;
  type: string;
}

export interface IWalletTokenState {
  accountId: number;
  accountXpub: string;
  holdings: any[];
  mintedTokens: any[];
  tokens: any;
}

export interface Connection {
  accountId: number;
  url: string;
}

export interface Tabs {
  canConnect: boolean;
  connections: Connection[];
  currentSenderURL: string;
  currentURL: string;
}

export default interface IWalletState {
  accounts: IAccountState[];
  activeAccountId: number;
  activeNetwork: string;
  canConnect: boolean;
  changingNetwork: boolean;
  confirmingTransaction: boolean;
  connections: any[];
  creatingAsset: boolean;
  currentSenderURL: string;
  currentURL: string;
  encriptedMnemonic: any;
  issuingAsset: boolean;
  issuingNFT: boolean;
  signingTransaction: boolean;
  status: number;
  // tabs: Tabs;
  transferringOwnership: boolean;
  updatingAsset: boolean;
  walletTokens: IWalletTokenState[];
}
