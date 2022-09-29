import {
  KeyringManager,
  IKeyringAccountState,
} from '@pollum-io/sysweb3-keyring';
import { getSysRpc, getEthRpc } from '@pollum-io/sysweb3-network';
import { INetwork } from '@pollum-io/sysweb3-utils';

import store from 'state/store';
import {
  forgetWallet as forgetWalletState,
  setActiveAccount,
  setEncryptedMnemonic,
  setLastLogin,
  setTimer,
  createAccount as addAccountToStore,
  setActiveNetwork as setNetwork,
  setActiveAccountProperty,
  setIsPendingBalances,
  setNetworks,
  removeNetwork as removeNetworkFromStore,
  removeNetwork,
  setStoreError,
  setIsBitcoinBased,
} from 'state/vault';
import { IMainController } from 'types/controllers';
import { ICustomRpcParams } from 'types/transactions';
import { removeXprv } from 'utils/account';
import { isBitcoinBasedNetwork, networkChain } from 'utils/network';

import WalletController from './account';
import { DAppEvents } from './message-handler/types';

const MainController = (): IMainController => {
  const keyringManager = KeyringManager();
  const walletController = WalletController(keyringManager);

  const setAutolockTimer = (minutes: number) => {
    store.dispatch(setTimer(minutes));
  };

  /** forget your wallet created with pali and associated with your seed phrase,
   *  but don't delete seed phrase so it is possible to create a new
   *  account using the same seed
   */
  const forgetWallet = (pwd: string) => {
    keyringManager.forgetMainWallet(pwd);

    store.dispatch(forgetWalletState());
    store.dispatch(setLastLogin());
  };

  const unlock = async (pwd: string): Promise<void> => {
    if (!keyringManager.checkPassword(pwd)) throw new Error('Invalid password');

    const account = (await keyringManager.login(pwd)) as IKeyringAccountState;

    store.dispatch(setLastLogin());
    store.dispatch(setActiveAccount(account));
  };

  const createWallet = async (password: string): Promise<void> => {
    store.dispatch(setIsPendingBalances(true));

    keyringManager.setWalletPassword(password);

    const account =
      (await keyringManager.createKeyringVault()) as IKeyringAccountState;

    store.dispatch(addAccountToStore(account));
    store.dispatch(setEncryptedMnemonic(keyringManager.getEncryptedMnemonic()));
    store.dispatch(setIsPendingBalances(false));
    store.dispatch(setActiveAccount(account));
    store.dispatch(setLastLogin());
  };

  const lock = () => {
    keyringManager.logout();

    store.dispatch(setLastLogin());
  };

  const createAccount = async (
    label?: string
  ): Promise<IKeyringAccountState> => {
    const newAccount = await walletController.addAccount(label);

    store.dispatch(addAccountToStore(newAccount));
    store.dispatch(setActiveAccount(newAccount));

    window.controller.dapp.dispatchEvent(
      DAppEvents.accountChange,
      removeXprv(newAccount)
    );

    return newAccount;
  };

  const setAccount = (id: number): void => {
    const { accounts } = store.getState().vault;

    keyringManager.setActiveAccount(id);
    store.dispatch(setActiveAccount(accounts[id]));

    walletController.account.sys.getLatestUpdate(false);

    window.controller.dapp.dispatchEvent(
      DAppEvents.accountChange,
      removeXprv(accounts[id])
    );
  };

  const setActiveNetwork = async (network: INetwork, chain: string) => {
    store.dispatch(setIsPendingBalances(true));

    const { activeNetwork } = store.getState().vault;

    const isBitcoinBased =
      chain === 'syscoin' && (await isBitcoinBasedNetwork(network));

    store.dispatch(setIsBitcoinBased(isBitcoinBased));

    try {
      const networkAccount = await keyringManager.setSignerNetwork(
        network,
        chain
      );

      store.dispatch(setNetwork(network));
      store.dispatch(setIsPendingBalances(false));
      store.dispatch(setActiveAccount(networkAccount));

      if (isBitcoinBased) {
        store.dispatch(
          setActiveAccountProperty({
            property: 'xpub',
            value: keyringManager.getAccountXpub(),
          })
        );

        store.dispatch(
          setActiveAccountProperty({
            property: 'xprv',
            value: keyringManager.getEncryptedXprv(),
          })
        );

        walletController.account.sys.setAddress();
      }

      window.controller.dapp.dispatchEvent(DAppEvents.chainChange, network);

      return networkAccount;
    } catch (error) {
      setActiveNetwork(activeNetwork, networkChain());

      store.dispatch(setStoreError(true));
    }
  };

  const resolveError = () => store.dispatch(setStoreError(false));

  const getRpc = async (data: ICustomRpcParams): Promise<INetwork> => {
    const { formattedNetwork } = data.isSyscoinRpc
      ? await getSysRpc(data)
      : await getEthRpc(data);

    return formattedNetwork;
  };

  const addCustomRpc = async (data: ICustomRpcParams): Promise<INetwork> => {
    const network = await getRpc(data);

    const chain = data.isSyscoinRpc ? 'syscoin' : 'ethereum';

    store.dispatch(setNetworks({ chain, network }));

    return network;
  };

  const editCustomRpc = async (
    newRpc: ICustomRpcParams,
    oldRpc: ICustomRpcParams
  ): Promise<INetwork> => {
    const changedChainId = oldRpc.chainId !== newRpc.chainId;
    const network = await getRpc(newRpc);

    const chain = newRpc.isSyscoinRpc ? 'syscoin' : 'ethereum';

    if (changedChainId) {
      store.dispatch(
        removeNetwork({
          chainId: oldRpc.chainId,
          prefix: chain,
        })
      );
    }
    store.dispatch(setNetworks({ chain, network }));

    return network;
  };

  const removeKeyringNetwork = (chain: string, chainId: number) => {
    keyringManager.removeNetwork(chain, chainId);

    store.dispatch(removeNetworkFromStore({ prefix: chain, chainId }));
  };

  const getRecommendedFee = () => {
    const { isBitcoinBased, activeNetwork } = store.getState().vault;

    const { tx } = isBitcoinBased
      ? walletController.account.sys
      : walletController.account.eth;

    if (isBitcoinBased) return tx.getRecommendedFee(activeNetwork.url);

    return tx.getRecommendedGasPrice(true).gwei;
  };

  return {
    createWallet,
    forgetWallet,
    unlock,
    lock,
    createAccount,
    account: walletController.account,
    setAccount,
    setAutolockTimer,
    setActiveNetwork,
    addCustomRpc,
    editCustomRpc,
    removeKeyringNetwork,
    resolveError,
    getRecommendedFee,
    ...keyringManager,
  };
};

export default MainController;
