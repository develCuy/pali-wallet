import { EventEmitter } from 'events';
import { browser } from 'webextension-polyfill-ts';

const emitter = new EventEmitter();

// Connect to pali
const backgroundPort = browser.runtime.connect(undefined, {
  name: 'pali-inject',
});

// Add listener for pali events
const checkForPaliRegisterEvent = (type, id) => {
  if (type === 'EVENT_REG') {
    console.log('Checking event emission:', type, id);
    emitter.on(id, (result) => {
      console.log('Checking event emission inside:', id, result);
      console.log(
        'windowDispatch response',
        window.dispatchEvent(
          new CustomEvent(id, { detail: JSON.stringify(result) })
        )
      );
    });
    return;
  }

  emitter.once(id, (result) => {
    if (typeof id === 'string') {
      if (String(id).includes('isUnlocked'))
        window.dispatchEvent(new CustomEvent(id, { detail: result }));
    }
    if (result)
      window.dispatchEvent(
        new CustomEvent(id, { detail: JSON.stringify(result) })
      );
    else window.dispatchEvent(new CustomEvent(id, { detail: null }));
  });
};

/**
 * Listens to local messages and sends them to pali
 */
const start = () => {
  window.addEventListener(
    'message',
    (event) => {
      if (event.source !== window) return;
      if (!event.data) return;

      const { id, type, data } = event.data;
      // console.log('Check eventData', data);

      if (!id || !type) return;

      // listen for the response
      checkForPaliRegisterEvent(type, id);

      backgroundPort.postMessage({
        id,
        type,
        data,
      });
    },
    false
  );
  const id = 'General';
  const type = 'CHAIN_NET_REQUEST';
  const data = {};
  backgroundPort.postMessage({
    id,
    type,
    data,
  });
};

const setDappNetworkProvider = (networkVersion?: any, chainId?: any) => {
  if (networkVersion && chainId) {
    return;
  }
  throw {
    code: 500,
    message: 'Couldnt fetch chainId and networkVersion',
  };
};

browser.runtime.onMessage.addListener(({ type, data }) => {
  if (type === 'CHAIN_CHANGED')
    setDappNetworkProvider(data.networkVersion, data.chainId);
});

// Every message from pali emits an event
backgroundPort.onMessage.addListener(({ id, data }) => {
  emitter.emit(id, data);
});

const doctypeCheck = () => {
  const { doctype } = window.document;

  if (doctype) {
    return doctype.name === 'html';
  }

  return true;
};
const suffixCheck = () => {
  const prohibitedTypes = [/\.xml$/u, /\.pdf$/u];
  const currentUrl = window.location.pathname;

  for (let i = 0; i < prohibitedTypes.length; i++) {
    if (prohibitedTypes[i].test(currentUrl)) {
      return false;
    }
  }

  return true;
};

const documentElementCheck = () => {
  const documentElement = document.documentElement.nodeName;

  if (documentElement) {
    return documentElement.toLowerCase() === 'html';
  }

  return true;
};

const blockedDomainCheck = () => {
  const blockedDomains = ['dropbox.com'];

  const currentUrl = window.location.href;
  let currentRegex;

  for (let i = 0; i < blockedDomains.length; i++) {
    const blockedDomain = blockedDomains[i].replace('.', '\\.');

    currentRegex = new RegExp(
      `(?:https?:\\/\\/)(?:(?!${blockedDomain}).)*$`,
      'u'
    );

    if (!currentRegex.test(currentUrl)) {
      return true;
    }
  }

  return false;
};

export const shouldInjectProvider = () =>
  doctypeCheck() &&
  suffixCheck() &&
  documentElementCheck() &&
  !blockedDomainCheck();

const injectScript = (content: string) => {
  try {
    const container = document.head || document.documentElement;
    const scriptTag = document.createElement('script');
    scriptTag.textContent = content;

    container.insertBefore(scriptTag, container.children[0]);
  } catch (error) {
    console.error('Pali Wallet: Provider injection failed.', error);
  }
};
const injectScriptFile = (file: string) => {
  console.log('Trying to load injectScriptFile');
  try {
    const container = document.head || document.documentElement;
    const scriptTag = document.createElement('script');
    scriptTag.src = browser.runtime.getURL(file);
    console.log('Done it', file, scriptTag);
    container.insertBefore(scriptTag, container.children[0]);
    console.log('Ueba');
  } catch (error) {
    console.error('Pali Wallet: Provider injection failed.', error);
  }
};
console.log('Should we inject provider albert', shouldInjectProvider());
if (shouldInjectProvider()) {
  injectScript("window.SyscoinWallet = 'Pali Wallet is installed! :)'");

  window.dispatchEvent(
    new CustomEvent('SyscoinStatus', {
      detail: { SyscoinInstalled: true, ConnectionsController: false },
    })
  );

  injectScriptFile('js/inpage.bundle.js');
}
start();
