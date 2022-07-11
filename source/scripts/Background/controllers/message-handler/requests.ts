import { v4 as uuid } from 'uuid';
import { browser, Runtime } from 'webextension-polyfill-ts';

import { IMasterController } from '..';
import { erc20DataDecoder } from 'utils/ethUtil';

import { Message, SupportedWalletMethods } from './types';

export const handleRequest = async (
  port: Runtime.Port,
  controller: IMasterController,
  message: Message,
  origin: string,
  setPendingWindow: (isPending: boolean) => void,
  isPendingWindow: () => boolean
) => {
  const { method, args, asset } = message.data;

  const isConnected = controller.dapp.isDAppConnected(origin);
  const walletIsLocked = !controller.wallet.isUnlocked();

  const provider =
    asset === 'SYS'
      ? controller.dapp.paliProvider
      : controller.dapp.ethereumProvider;

  let result: any;

  const windowId = `signMessage${uuid()}`;

  console.log('asset and provider', asset, provider);

  const isSignMessage = async () => {
    if (isPendingWindow()) {
      return Promise.resolve(null);
    }

    const popup = await controller.createPopup(windowId);
    setPendingWindow(true);

    controller.dapp.setSigRequest({
      origin: origin as string,
      address: args[1],
      message: args[0],
    });

    window.addEventListener(
      'sign',
      (ev: any) => {
        if (ev.detail.substring(1) === windowId) {
          result = controller.dapp.paliProvider.signMessage(args[0]);
          port.postMessage({ id: message.id, data: { result } });
          setPendingWindow(false);
        }
      },
      {
        once: true,
        passive: true,
      }
    );

    browser.windows.onRemoved.addListener((id) => {
      if (popup && id === popup.id) {
        port.postMessage({ id: message.id, data: { result: false } });
        setPendingWindow(false);
      }
    });

    return Promise.resolve(null);
  };

  const sendTransaction = async (data) => {
    await controller.createPopup(
      windowId,
      message.data.network,
      'sendTransaction',
      { ...data }
    );

    setPendingWindow(true);

    window.addEventListener(
      'transactionSent',
      (ev: any) => {
        if (ev.detail.windowId === windowId) {
          port.postMessage({
            id: message.id,
            data: { result: true, data: {} },
          });
          setPendingWindow(false);
        }
      },
      { once: true, passive: true }
    );
  };

  const approveSpend = async (data) => {
    await controller.createPopup(
      windowId,
      message.data.network,
      'approveSpend',
      { ...data }
    );

    setPendingWindow(true);

    window.addEventListener(
      'spendApproved',
      (ev: any) => {
        if (ev.detail.windowId === windowId) {
          port.postMessage({
            id: message.id,
            data: { result: true, data: {} },
          });
          setPendingWindow(false);
        }
      },
      { once: true, passive: true }
    );
  };

  const isSendTransaction = () => {
    const data = args[0] ? args[0][0] : {};
    const decoder = erc20DataDecoder();
    const decodedTxData = data?.data ? decoder.decodeData(data?.data) : null;

    if (decodedTxData?.method === 'approve') {
      return approveSpend(data);
    }

    return sendTransaction(data);
  };

  console.log(
    '[handle request] method:',
    method,
    SupportedWalletMethods[method],
    provider.getBalance()
  );

  switch (+method) {
    case SupportedWalletMethods.isConnected:
      result = { connected: !!isConnected && !walletIsLocked };
      break;
    case SupportedWalletMethods.getAddress:
      result = provider.getAddress();
      break;
    case SupportedWalletMethods.getAccounts:
      result = provider.getAccounts();
      break;
    case SupportedWalletMethods.setAccount:
      result = provider.setAccount();
      break;
    case SupportedWalletMethods.getChainId:
      result = provider.getChainId();
      break;
    case SupportedWalletMethods.getBlockNumber:
      result = provider.getBlockNumber();
      break;
    case SupportedWalletMethods.estimateGas:
      result = await provider.getGasEstimate();
      break;
    case SupportedWalletMethods.getNetwork:
      result = provider.getNetwork();
      break;
    case SupportedWalletMethods.getBalance:
      result = provider.getBalance();
      break;
    case SupportedWalletMethods.signMessage:
      isSignMessage();
      break;
    case SupportedWalletMethods.sendTransaction:
      isSendTransaction();
      break;
    default:
      return isSendTransaction();
  }

  if (result !== undefined) {
    return Promise.resolve({ id: message.id, result });
  }

  return Promise.reject(
    new CustomEvent(message.id, { detail: 'Unknown Request' })
  );
};
