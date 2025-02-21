import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import { Layout, PrimaryButton, SecondaryButton } from 'components/index';
import { useQueryData } from 'hooks/index';
import { RootState } from 'state/store';
import { dispatchBackgroundEvent, getController } from 'utils/browser';

interface ISign {
  send?: boolean;
}
const EncryptPubKey: React.FC<ISign> = () => {
  const { host, ...data } = useQueryData();

  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const { accounts, activeAccount: activeAccountMeta } = useSelector(
    (state: RootState) => state.vault
  );
  const activeAccount = accounts[activeAccountMeta.type][activeAccountMeta.id];
  const activeNetwork = useSelector(
    (state: RootState) => state.vault.activeNetwork
  );
  const { isBitcoinBased } = useSelector((state: RootState) => state.vault);
  const { label, balances, address } = activeAccount;
  const { currency } = activeNetwork;

  const onSubmit = async () => {
    const { ethereumTransaction } = getController().wallet;
    setLoading(true);
    const type = data.eventName;
    if (data.address !== address) {
      const response = {
        code: 4001,
        message: 'Pali: Asking for key of non connected account',
      };
      dispatchBackgroundEvent(`${type}.${host}`, response);
      window.close();
    }
    const response = await ethereumTransaction.getEncryptedPubKey();
    setConfirmed(true);
    setLoading(false);
    dispatchBackgroundEvent(`${type}.${host}`, response);
    window.close();
  };
  return (
    <Layout canGoBack={false} title={'Encryption Public Key Request'}>
      {!loading && (
        <div className="flex flex-col items-center justify-center w-full">
          <div className="flex flex-row justify-between mb-16 w-full">
            <p className="font-poppins text-sm">Account: {label}</p>
            <p className="font-poppins text-sm">
              Balance: {balances[isBitcoinBased ? 'syscoin' : 'ethereum']}{' '}
              {currency.toUpperCase()}
            </p>
          </div>
          <div className="flex flex-col pb-4 pt-4 w-full border-b border-t border-dashed border-dashed-dark">
            <div className="scrollbar-styled mt-1 px-4 w-full h-14 text-xs overflow-auto">
              <span>
                {host} would like your public encryption key. By consenting,
                this site will be able to compose encrypted messages to you.
              </span>
            </div>
          </div>

          <div className="absolute bottom-10 flex items-center justify-between px-10 w-full md:max-w-2xl">
            <SecondaryButton type="button" onClick={window.close}>
              Cancel
            </SecondaryButton>

            <PrimaryButton
              type="submit"
              disabled={confirmed}
              loading={loading}
              onClick={onSubmit}
            >
              Confirm
            </PrimaryButton>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default EncryptPubKey;
