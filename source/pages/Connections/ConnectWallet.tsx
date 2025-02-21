import { Dialog } from '@headlessui/react';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { KeyringAccountType } from '@pollum-io/sysweb3-keyring';

import {
  Layout,
  PrimaryButton,
  SecondaryButton,
  Icon,
  Modal,
} from 'components/index';
import trustedApps from 'constants/trustedApps.json';
import { useQueryData } from 'hooks/index';
import { RootState } from 'state/store';
import { dispatchBackgroundEvent, getController } from 'utils/browser';
import { ellipsis } from 'utils/index';

export const ConnectWallet = () => {
  const { dapp, wallet } = getController();
  const { host, chain, chainId, eventName } = useQueryData();
  const accounts = useSelector((state: RootState) => state.vault.accounts);
  const isBitcoinBased = useSelector(
    (state: RootState) => state.vault.isBitcoinBased
  );

  const currentAccountId = dapp.get(host)?.accountId;
  const currentAccountType = dapp.get(host)?.accountType;

  const [accountId, setAccountId] = useState(currentAccountId);
  const [accountType, setAccountType] = useState(currentAccountType);
  const [confirmUntrusted, setConfirmUntrusted] = useState(false);

  const isUnlocked = wallet.isUnlocked();
  const handleConnect = () => {
    const date = Date.now();
    dapp.connect({ host, chain, chainId, accountId, accountType, date });
    wallet.setAccount(accountId, accountType);
    dispatchBackgroundEvent(
      `${eventName}.${host}`,
      dapp.getAccount(host).address
    );
    window.close();
  };

  const onConfirm = () => {
    const isTrusted = trustedApps.includes(host);
    if (isTrusted) handleConnect();
    else setConfirmUntrusted(true);
  };

  useEffect(() => {
    if (dapp.isConnected(host) && isUnlocked) {
      dapp.connect(
        { host, chain, chainId, accountId, accountType, date: 0 },
        true
      );
      dispatchBackgroundEvent(
        `${eventName}.${host}`,
        dapp.getAccount(host).address
      );
      window.close();
    }
  }, [isUnlocked]);

  return (
    <Layout canGoBack={false} title="CONNECT ACCOUNT" titleOnly={true}>
      <div className="flex flex-col gap-7 items-center justify-center mt-6 w-full">
        {accounts && Object.keys(accounts).length > 0 ? (
          <>
            {Object.entries(accounts).map(([keyringAccountType, account]) => {
              if (
                isBitcoinBased &&
                keyringAccountType === KeyringAccountType.Imported
              ) {
                return null;
              }

              let accountList = Object.values(account);

              if (!accountList.length) return null;

              switch (keyringAccountType) {
                case KeyringAccountType.Trezor:
                  if (!isBitcoinBased) {
                    for (const acc of accountList) {
                      const networkKeys = Object.keys(acc.originNetwork);

                      if (networkKeys.includes('slip44')) {
                        accountList = accountList.filter((ac) => ac !== acc);
                      }
                    }
                  } else {
                    for (const acc of accountList) {
                      const networkKeys = Object.keys(acc.originNetwork);

                      if (!networkKeys.includes('slip44')) {
                        accountList = accountList.filter((ac) => ac !== acc);
                      }
                    }
                  }
                  break;
              }
              return (
                <div
                  key={keyringAccountType}
                  className="h-fit flex flex-col text-center"
                >
                  <h3 className="text-sm font-semibold">
                    {keyringAccountType === KeyringAccountType.HDAccount
                      ? 'Pali Account'
                      : keyringAccountType}
                  </h3>
                  <ul
                    className={`scrollbar-styled flex flex-col gap-4 mt-4 px-8 w-full h-${
                      accountList.length === 1 || accountList.length === 2
                        ? 'fit'
                        : '32'
                    } overflow-auto`}
                  >
                    {accountList.map((acc) => (
                      <li
                        className={`${
                          acc.id === currentAccountId &&
                          accountType === keyringAccountType
                            ? 'cursor-not-allowed bg-opacity-50 border-brand-royalblue'
                            : 'cursor-pointer hover:bg-bkg-4 border-brand-royalblue'
                        } border border-solid  rounded-lg px-2 py-4 text-xs bg-bkg-2 w-48 flex justify-between items-center transition-all duration-200`}
                        key={`${acc.id}-${keyringAccountType}`}
                        onClick={() => {
                          setAccountId(acc.id);
                          setAccountType(
                            keyringAccountType as KeyringAccountType
                          );
                        }}
                      >
                        <p>{acc.label}</p>

                        <div className="flex gap-3 items-center justify-center">
                          <small>{ellipsis(acc.address)}</small>

                          <div
                            className={`${
                              acc.id === accountId &&
                              accountType === keyringAccountType
                                ? 'bg-warning-success'
                                : 'bg-brand-graylight'
                            } w-3 h-3 rounded-full border border-brand-royalblue`}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </>
        ) : (
          <div>
            <Icon name="loading" className="w-4 text-brand-graylight" />
          </div>
        )}

        <small className="absolute bottom-28 text-center text-brand-royalblue text-sm">
          Only connect with sites you trust.{' '}
          <a href="https://docs.syscoin.org/">Learn more.</a>
        </small>

        <div className="absolute bottom-10 flex gap-3 items-center justify-between px-10 w-full md:max-w-2xl">
          <SecondaryButton type="button" action onClick={() => window.close()}>
            Cancel
          </SecondaryButton>

          <PrimaryButton
            type="button"
            action
            disabled={accountId === undefined && accountType === undefined}
            onClick={onConfirm}
          >
            Confirm
          </PrimaryButton>
        </div>

        <Modal show={confirmUntrusted}>
          <div className="inline-block align-middle my-8 p-6 w-full max-w-2xl text-center font-poppins bg-bkg-4 border border-brand-royalblue rounded-2xl shadow-xl overflow-hidden transform transition-all">
            <Dialog.Title
              as="h3"
              className="flex gap-3 items-center justify-center text-brand-white text-lg font-medium leading-6"
            >
              <Icon name="warning" className="mb-2 text-brand-white" />
              <p>Non trusted site detected</p>
            </Dialog.Title>

            <div className="mt-4">
              <p className="text-brand-white text-sm">
                This site is not on our trusted list. Are you sure you want to
                connect?
              </p>
            </div>

            <div className="flex gap-5 items-center justify-between mt-8">
              <SecondaryButton
                action
                width="32"
                type="button"
                onClick={() => window.close()}
              >
                Cancel
              </SecondaryButton>

              <PrimaryButton
                action
                width="32"
                type="button"
                onClick={() => handleConnect()}
              >
                Confirm
              </PrimaryButton>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};
