import { browser } from 'webextension-polyfill-ts';

/**
 * Opens a popup and adds events listener to resolve a promise.
 *
 * @param host The dApp host
 * @param route The popup route
 * @param eventName The event which will resolve the promise.
 * The final event name is `eventName.host`
 * @param data information that will be passed to the route. Optional
 *
 * @return either the event data or `{ success: boolean }`
 */
export const popupPromise = async ({
  data,
  eventName,
  host,
  route,
}: {
  data?: object;
  eventName: string;
  host: string;
  route: string;
}) => {
  const { dapp, createPopup } = window.controller;
  if (eventName !== 'connect' && !dapp.isConnected(host)) return;
  if (dapp.hasWindow(host)) return;

  data = JSON.parse(JSON.stringify(data).replace(/#(?=\S)/g, ''));

  const popup = await createPopup(route, { ...data, host, eventName });
  dapp.setHasWindow(host, true);

  return new Promise((resolve) => {
    window.addEventListener(
      `${eventName}.${host}`,
      (event: CustomEvent) => {
        if (event.detail !== undefined && event.detail !== null) {
          resolve(event.detail);
        }
        resolve({ success: true });
      },
      { once: true, passive: true }
    );

    browser.windows.onRemoved.addListener((id) => {
      if (id === popup.id) {
        dapp.setHasWindow(host, false);
        resolve({ success: false });
      }
    });
  });
};
