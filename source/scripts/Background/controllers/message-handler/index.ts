import { browser, Runtime } from 'webextension-polyfill-ts';

import { disable } from './disable';
import { enable } from './enable';
import { setupEvents, registerEvent, deregisterEvent } from './events';
import { methodRequest } from './requests';
import { Message } from './types';

export const setupConnection = (port: Runtime.Port) => {
  let pendingWindow = false;

  const setPendingWindow = (isPending: boolean): void => {
    pendingWindow = isPending;
  };

  const isPendingWindow = (): boolean => pendingWindow;

  setupEvents(port);

  const origin = new URL(port.sender?.url).host;

  const messageHandler = async (message: Message, connection: Runtime.Port) => {
    if (browser.runtime.lastError) {
      throw new Error('Runtime last error');
    }

    const title = connection.sender?.tab?.title;

    window.controller.dapp.setCurrent(origin, title);

    switch (message.type) {
      case 'EVENT_REG':
        return registerEvent(message);
      case 'EVENT_DEREG':
        return deregisterEvent(message);
      case 'ENABLE':
        return enable(message, origin, setPendingWindow, isPendingWindow);
      case 'DISABLE':
        return disable(origin, isPendingWindow);
      case 'METHOD_REQUEST':
        return methodRequest(
          message,
          origin,
          setPendingWindow,
          isPendingWindow
        );
      default:
        throw new Error('Unknown message type');
    }
  };

  const onMessage = async (message: Message, _port: Runtime.Port) => {
    console.log(`[DApp] Message from ${origin}`, message.type, message.data);
    try {
      const response = await messageHandler(message, _port);
      if (response === undefined) return;

      console.log('[DApp] Response', response);
      port.postMessage({ id: message.id, data: response });
    } catch (error: any) {
      console.error(error);

      port.postMessage({ id: message.id, data: { error: error.message } });
    }
  };

  const onDisconnect = () => {
    window.controller.dapp.removeListeners(origin);
  };

  port.onMessage.addListener(onMessage);
  port.onDisconnect.addListener(onDisconnect);
};
