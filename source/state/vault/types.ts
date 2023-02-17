import { IKeyringAccountState } from '@pollum-io/sysweb3-keyring';
import { INetwork, INetworkType } from '@pollum-io/sysweb3-utils';

export interface IVaultState {
  accounts: {
    [id: number]: IKeyringAccountState;
  };
  activeAccount: number;
  activeNetwork: INetwork;
  changingConnectedAccount: IChangingConnectedAccount;
  encryptedMnemonic: string;
  error: boolean;
  isBitcoinBased: boolean;
  isLoadingTxs: boolean;
  isNetworkChanging: boolean;
  isPendingBalances: boolean;
  isPopupOpen: boolean;
  lastLogin: number;
  networks: {
    [INetworkType.Ethereum]: {
      [chainId: number]: INetwork;
    };
    [INetworkType.Syscoin]: {
      [chainId: number]: INetwork;
    };
  };
  timer: number;
}

export interface IChangingConnectedAccount {
  host: string | undefined;
  isChangingConnectedAccount: boolean;
  newConnectedAccount: IKeyringAccountState | undefined;
}

export interface IHolding {
  NFTID: string;
  assetGuid: string;
  balance: number;
  baseAssetID: string;
  childAssetID: string;
  decimals: number;
  description: string;
  symbol: string;
  type: string;
}

export interface IMintedToken {
  assetGuid: string;
  maxSupply: number;
  symbol: string;
  totalSupply: number;
}

export type IOmmitedAccount = Omit<IKeyringAccountState, 'xprv'>;

export type IOmittedVault = Omit<IVaultState, 'accounts'> & {
  accounts: { [id: number]: IOmmitedAccount };
};
