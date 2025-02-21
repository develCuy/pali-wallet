import { ethErrors } from 'helpers/errors';

import { KeyringAccountType } from '@pollum-io/sysweb3-keyring';
import { INetwork } from '@pollum-io/sysweb3-network';

import { EthProvider } from 'scripts/Provider/EthProvider';
import { SysProvider } from 'scripts/Provider/SysProvider';
import store from 'state/store';
import { getController } from 'utils/browser';
import cleanErrorStack from 'utils/cleanErrorStack';
import { networkChain } from 'utils/network';

import { popupPromise } from './popup-promise';
/**
 * Handles methods request.
 *
 * Methods have a prefix and a name. Prefixes are the destination of the
 * request. Supported: sys, eth, wallet
 *
 * @return The method return
 */
export const methodRequest = async (
  host: string,
  data: { method: string; network?: string; params?: any[] }
) => {
  const { dapp, wallet } = window.controller;
  const controller = getController();
  const [prefix, methodName] = data.method.split('_');
  const { activeAccount, isBitcoinBased, isNetworkChanging, accounts } =
    store.getState().vault;
  if (prefix === 'wallet' && methodName === 'isConnected')
    return dapp.isConnected(host);
  if (data.method && !isBitcoinBased && prefix !== 'sys') {
    const provider = EthProvider(host);
    const resp = await provider.unrestrictedRPCMethods(
      data.method,
      data.params
    );
    if (resp !== false && resp !== undefined) {
      return resp; //Sending back to Dapp non restrictive method response
    }
  }
  const account = dapp.getAccount(host);
  const isRequestAllowed = dapp.isConnected(host) && account;
  if (prefix === 'eth' && methodName === 'requestAccounts') {
    return await enable(host, undefined, undefined);
  }
  if (prefix === 'sys' && methodName === 'requestAccounts') {
    return await enable(host, undefined, undefined, true);
  }

  if (prefix === 'eth' && methodName === 'accounts') {
    return isBitcoinBased
      ? cleanErrorStack(ethErrors.rpc.internal())
      : wallet.isUnlocked()
      ? [dapp.getAccount(host).address]
      : [];
  }
  if (
    !isRequestAllowed &&
    methodName !== 'switchEthereumChain' &&
    methodName !== 'getProviderState' &&
    methodName !== 'getSysProviderState' &&
    methodName !== 'getAccount' &&
    methodName !== 'changeUTXOEVM'
  )
    throw cleanErrorStack(ethErrors.provider.unauthorized());
  const estimateFee = () => wallet.getRecommendedFee(dapp.getNetwork().url);

  //* Wallet methods
  if (prefix === 'wallet') {
    let tryingToAdd = false;
    const { activeNetwork, networks: chains } = store.getState().vault;
    switch (methodName) {
      case 'isLocked':
        return !wallet.isUnlocked();
      case 'getChangeAddress':
        if (!isBitcoinBased)
          throw cleanErrorStack(
            ethErrors.provider.unauthorized(
              'Method only available for syscoin UTXO chains'
            )
          );
        return controller.wallet.getChangeAddress(dapp.getAccount(host).id);
      case 'getAccount':
        if (!isBitcoinBased)
          throw cleanErrorStack(
            ethErrors.provider.unauthorized(
              'Method only available for syscoin UTXO chains'
            )
          );
        return account;
      case 'getBalance':
        return Boolean(account) && account.balances[networkChain()];
      case 'getNetwork':
        return dapp.getNetwork();
      case 'getPublicKey':
        return account.xpub;
      case 'getAddress':
        return account.address;
      case 'getTokens':
        return account.assets;
      case 'estimateFee':
        return estimateFee();
      case 'changeAccount':
        if (!wallet.isUnlocked()) return false;
        return popupPromise({
          host,
          route: 'change-account',
          eventName: 'accountsChanged',
          data: { network: data.network },
        });
      case 'requestPermissions':
        if (isBitcoinBased)
          throw cleanErrorStack(
            ethErrors.provider.unauthorized(
              'Method only available for EVM chains'
            )
          );
        if (!wallet.isUnlocked()) return false;
        return popupPromise({
          host,
          route: 'change-account',
          eventName: 'requestPermissions',
          data: { params: data.params },
        });
      case 'getPermissions':
        //This implementation should be improved to integrate in a more appropriate way the EIP2255
        const response: any = [{}];
        response[0].caveats = [
          { type: 'restrictReturnedAccounts', value: [dapp.getAccount(host)] },
        ];
        response[0].date = dapp.get(host).date;
        response[0].invoker = host;
        response[0].parentCapability = 'eth_accounts';

        return response;
      case 'addEthereumChain':
        if (isBitcoinBased)
          throw cleanErrorStack(
            ethErrors.provider.unauthorized(
              'Method only available for EVM chains'
            )
          );
        const customRPCData = {
          url: data.params[0].rpcUrls[0],
          chainId: Number(data.params[0].chainId),
          label: data.params[0].chainName,
          apiUrl: data.params[0]?.blockExplorerUrls
            ? data.params[0].blockExplorerUrls[0]
            : undefined,
          isSyscoinRpc: false,
          symbol: data.params[0].nativeCurrency.symbol,
        };
        const network = await controller.wallet.getRpc(customRPCData);
        if (!chains.ethereum[customRPCData.chainId] && !isBitcoinBased) {
          return popupPromise({
            host,
            route: 'add-EthChain',
            eventName: 'wallet_addEthereumChain',
            data: { ...customRPCData, symbol: network?.currency },
          });
        }
        tryingToAdd = true;
      case 'switchEthereumChain':
        if (isBitcoinBased) throw cleanErrorStack(ethErrors.rpc.internal());
        const chainId = tryingToAdd
          ? customRPCData.chainId
          : Number(data.params[0].chainId);

        if (activeNetwork.chainId === chainId) return null;
        else if (chains.ethereum[chainId] && !isNetworkChanging) {
          return popupPromise({
            host,
            route: 'switch-EthChain',
            eventName: 'wallet_switchEthereumChain',
            data: { chainId: chainId },
          });
        } else if (isNetworkChanging)
          throw cleanErrorStack(
            ethErrors.rpc.resourceUnavailable({
              message: 'Already processing network change. Please wait',
            })
          );
        throw cleanErrorStack(ethErrors.rpc.internal());
      case 'getProviderState':
        const providerState = {
          accounts: dapp.getAccount(host)
            ? [dapp.getAccount(host).address]
            : [],
          chainId: `0x${activeNetwork.chainId.toString(16)}`,
          isUnlocked: wallet.isUnlocked(),
          networkVersion: activeNetwork.chainId,
          isBitcoinBased,
        };
        return providerState;
      case 'getSysProviderState':
        const blockExplorerURL = isBitcoinBased ? activeNetwork.url : null;
        const sysProviderState = {
          xpub: dapp.getAccount(host)?.xpub ? dapp.getAccount(host).xpub : null,
          blockExplorerURL: blockExplorerURL,
          isUnlocked: wallet.isUnlocked(),
          isBitcoinBased,
        };
        return sysProviderState;
      default:
        throw cleanErrorStack(ethErrors.rpc.methodNotFound());
    }
  }

  //* Change between networks methods

  const validatePrefixAndCurrentChain =
    (prefix === 'sys' && !isBitcoinBased) ||
    (prefix === 'eth' && isBitcoinBased);

  const validateChangeUtxoEvmMethodName = methodName === 'changeUTXOEVM';

  if (validatePrefixAndCurrentChain && validateChangeUtxoEvmMethodName) {
    const { chainId } = data.params[0];

    const networks = store.getState().vault.networks;

    const newChainValue = prefix === 'sys' ? 'Syscoin' : 'Ethereum';
    const findCorrectNetwork: INetwork =
      networks[newChainValue.toLowerCase()][chainId];
    if (!findCorrectNetwork) {
      throw cleanErrorStack(
        ethErrors.provider.unauthorized('Network request does not exists')
      );
    }
    const changeNetwork = (await popupPromise({
      host,
      data: {
        newNetwork: findCorrectNetwork,
        newChainValue: newChainValue,
      },
      route: 'switch-UtxoEvm',
      eventName: 'change_UTXOEVM',
    })) as any;

    if (changeNetwork && changeNetwork.error) {
      return;
    }
    if (dapp.isConnected(host)) {
      await popupPromise({
        host,
        route: 'change-account',
        eventName: 'accountsChanged',
        data: { network: findCorrectNetwork },
      });
    } else {
      await popupPromise({
        host,
        route: 'connect-wallet',
        eventName: 'connect',
        data: { newChainValue, chainId: findCorrectNetwork.chainId },
      });
    }
    return;
  } else if (
    validateChangeUtxoEvmMethodName &&
    !validatePrefixAndCurrentChain
  ) {
    throw cleanErrorStack(
      ethErrors.provider.unauthorized(
        'Method only available when connected on correct Network and using correct Prefix'
      )
    );
  }

  if (
    prefix !== 'sys' &&
    !isBitcoinBased &&
    EthProvider(host).checkIsBlocking(data.method) &&
    accounts[activeAccount.type][activeAccount.id].address !==
      dapp.getAccount(host).address
  ) {
    const dappAccount = dapp.getAccount(host);
    const dappAccountType = dappAccount.isImported
      ? KeyringAccountType.Imported
      : KeyringAccountType.HDAccount;

    const response = await popupPromise({
      host,
      route: 'change-active-connected-account',
      eventName: 'changeActiveConnected',
      data: {
        connectedAccount: dappAccount,
        accountType: dappAccountType,
      },
    });
    if (!response) {
      throw cleanErrorStack(ethErrors.rpc.internal());
    }
  }

  //* Providers methods
  if (prefix !== 'sys' && !isBitcoinBased) {
    const provider = EthProvider(host);
    const resp = await provider.restrictedRPCMethods(data.method, data.params);
    if (!wallet.isUnlocked()) return false;
    if (!resp) throw cleanErrorStack(ethErrors.rpc.invalidRequest());

    return resp;
  } else if (prefix === 'sys' && !isBitcoinBased) {
    throw cleanErrorStack(ethErrors.rpc.internal());
  } else if (prefix === 'eth' && isBitcoinBased) {
    throw cleanErrorStack(
      ethErrors.provider.unauthorized(
        'Method only available when connected on EVM chains'
      )
    );
  }

  const provider = SysProvider(host);
  const method = provider[methodName];

  if (!method) throw cleanErrorStack(ethErrors.rpc.methodNotFound());

  if (data.params) return await method(...data.params);

  return await method();
};

export const enable = async (
  host: string,
  chain: string,
  chainId: number,
  isSyscoinDapp = false
) => {
  const { isBitcoinBased } = store.getState().vault;
  const { isOpen: isPopupOpen } = JSON.parse(
    window.localStorage.getItem('isPopupOpen')
  );
  if (!isSyscoinDapp && isBitcoinBased)
    throw ethErrors.provider.custom({
      code: 4101,
      message: 'Connected to Bitcoin based chain',
      data: { code: 4101, message: 'Connected to Bitcoin based chain' },
    });
  else if (isSyscoinDapp && !isBitcoinBased)
    throw ethErrors.provider.custom({
      code: 4101,
      message: 'Connected to Ethereum based chain',
      data: { code: 4101, message: 'Connected to Ethereum based chain' },
    });

  const { dapp, wallet } = window.controller;
  if (dapp.isConnected(host) && wallet.isUnlocked())
    return [dapp.getAccount(host).address];

  if (isPopupOpen)
    throw cleanErrorStack(
      ethErrors.rpc.resourceUnavailable({
        message: 'Already processing eth_requestAccounts. Please wait.',
      })
    );

  const dAppActiveAddress: any = await popupPromise({
    host,
    route: 'connect-wallet',
    eventName: 'connect',
    data: { chain, chainId },
  });

  if (!dAppActiveAddress)
    throw cleanErrorStack(ethErrors.provider.userRejectedRequest());

  return [dAppActiveAddress];
};

export const isUnlocked = () => {
  const { wallet } = window.controller;
  return wallet.isUnlocked();
};
