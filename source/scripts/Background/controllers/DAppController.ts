import { browser } from 'webextension-polyfill-ts';

import { IKeyringAccountState } from '@pollum-io/sysweb3-utils';

import { EthProvider } from 'scripts/Provider/EthProvider';
import { SysProvider } from 'scripts/Provider/SysProvider';
import {
  addDApp,
  removeDApp,
  addListener as addListenerAction,
  removeListener as removeListenerAction,
  removeListeners as removeListenersAction,
} from 'state/dapp';
import { IDApp } from 'state/dapp/types';
import store from 'state/store';
import { IDAppController } from 'types/controllers';

export interface ISigRequest {
  address: string;
  message: string;
  origin: string;
}

const DAppController = (): IDAppController => {
  // TODO multiple connections support

  let current: IDApp = {
    accountId: null,
    origin: '',
    title: '',
  };
  let request: ISigRequest;

  const isConnected = (origin: string) => {
    const { dapps } = store.getState().dapp;

    return !!dapps[origin];
  };

  const hasConnectedAccount = () => current.accountId !== null;

  const setCurrent = (origin: string, title: string) => {
    current = {
      ...current,
      origin,
      title,
    };

    return isConnected(origin);
  };

  const _connect = (dapp: IDApp) => {
    current.accountId = dapp.accountId;
    store.dispatch(addDApp(dapp));
  };

  const connect = async (accountId: number) => {
    _connect({ ...current, accountId });

    _dispatchEvents([new CustomEvent('connect', { detail: { origin } })]);
  };

  const changeAccount = async (accountId: number) => {
    _connect({ ...current, accountId });

    _dispatchEvents([new CustomEvent('accountChange', { detail: { origin } })]);
  };

  const _dispatchEvents = async (events: Event[]) => {
    const background = await browser.runtime.getBackgroundPage();

    events.forEach((event) => background.dispatchEvent(event));
  };

  const disconnect = (origin: string) => {
    current.accountId = null;
    store.dispatch(removeDApp(origin));

    _dispatchEvents([new CustomEvent('disconnect', { detail: { origin } })]);
  };

  const addListener = (origin: string, eventName: string) => {
    store.dispatch(addListenerAction({ origin, eventName }));
  };

  const removeListener = (origin: string, eventName: string) => {
    store.dispatch(removeListenerAction({ origin, eventName }));
  };

  const removeListeners = (origin: string) => {
    store.dispatch(removeListenersAction(origin));
  };

  const hasListener = (origin: string, eventName: string) => {
    const { dapp } = store.getState();

    return dapp.listeners[origin] && dapp.listeners[origin].includes(eventName);
  };

  const getCurrent = () => current;

  const getConnectedAccount = (): IKeyringAccountState | undefined => {
    const { accounts } = store.getState().vault;
    return accounts[current.accountId];
  };

  // TODO review sig request
  const setSigRequest = (req: ISigRequest) => {
    request = req;
  };

  const getSigRequest = () => request;

  const sysProvider = SysProvider();
  const ethProvider = EthProvider();

  return {
    getCurrent,
    setCurrent,
    getConnectedAccount,
    hasConnectedAccount,
    connect,
    changeAccount,
    setSigRequest,
    getSigRequest,
    disconnect,
    addListener,
    removeListener,
    removeListeners,
    hasListener,
    isConnected,
    sysProvider,
    ethProvider,
  };
};

export default DAppController;
