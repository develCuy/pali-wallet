import { browser } from 'webextension-polyfill-ts';

import { Message } from './types';

export const methodRequest = async (
  message: Message,
  origin: string,
  setPendingWindow: (isPending: boolean) => void,
  isPendingWindow: () => boolean
) => {
  const { dapp } = window.controller;

  const [prefix, methodName] = message.data.method.split('_');
  if (prefix === 'wallet') {
    switch (methodName) {
      case 'isConnected':
        const isConnected = dapp.isConnected(origin);
        const hasConnectedAccount = dapp.hasConnectedAccount();
        return isConnected && hasConnectedAccount;
      case 'changeAccount':
        return changeAccount(
          message.data.network,
          origin,
          isPendingWindow,
          setPendingWindow
        );
      default:
        throw new Error('Unknown method');
    }
  }

  const provider = prefix === 'sys' ? dapp.sysProvider : dapp.ethProvider;
  const method = provider[methodName];

  if (!method) throw new Error('Unknown method');

  return await method(message.data.args);
};

const changeAccount = async (
  network: string,
  origin: string,
  isPendingWindow: () => boolean,
  setPendingWindow: (isPending: boolean) => void
) => {
  const { dapp, createPopup } = window.controller;
  const isWhitelisted = dapp.isConnected(origin);
  const hasConnectedAccount = dapp.hasConnectedAccount();
  const isConnected = isWhitelisted && hasConnectedAccount;

  if (isPendingWindow() || !isConnected) return;

  const popup = await createPopup('change-account', { network });

  setPendingWindow(true);

  return new Promise<boolean>((resolve) => {
    window.addEventListener(
      'accountChange',
      (event: CustomEvent) => {
        if (event.detail.origin === origin) {
          setPendingWindow(false);
          resolve(true);
        }
      },
      { once: true, passive: true }
    );

    browser.windows.onRemoved.addListener((id) => {
      if (id === popup.id) {
        setPendingWindow(false);
        resolve(false);
      }
    });
  });
};
