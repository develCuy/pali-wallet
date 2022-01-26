import React, { FC, useCallback, Fragment } from 'react';
import { IconButton, Icon } from 'components/index';
import { useFormat, useUtils } from 'hooks/index';
import { Assets, Transaction } from 'types/transactions';

interface IPanelList {
  activity: boolean;
  assets: boolean;
  data: any;
}

export const PanelList: FC<IPanelList> = ({
  data,
  assets = false,
  activity = false,
}) => {
  const { formatDistanceDate, ellipsis, formatCurrency } = useFormat();

  const { navigate } = useUtils();

  const isShowedGroupBar = useCallback(
    (tx: Transaction, idx: number) =>
      idx === 0 ||
      new Date(tx.blockTime * 1e3).toDateString() !==
        new Date(data[idx - 1].blockTime * 1e3).toDateString(),
    [data]
  );

  const getTxType = (tx: Transaction) => {
    if (tx.tokenType === 'SPTAssetActivate') {
      return 'SPT creation';
    }

    if (tx.tokenType === 'SPTAssetSend') {
      return 'SPT mint';
    }

    if (tx.tokenType === 'SPTAssetUpdate') {
      return 'SPT update';
    }

    return 'Transaction';
  };

  return (
    <>
      {activity && (
        <ul className="pb-8">
          {data.map((tx: Transaction, idx: number) => {
            const isConfirmed = tx.confirmations > 0;
            const timestamp = new Date(tx.blockTime * 1000).toLocaleTimeString(
              navigator.language,
              {
                hour: '2-digit',
                minute: '2-digit',
              }
            );

            return (
              <Fragment key={tx.txid}>
                {isShowedGroupBar(tx, idx) && (
                  <li className="bg-bkg-1 text-sm text-center my-3">
                    {formatDistanceDate(
                      new Date(tx.blockTime * 1000).toDateString()
                    )}
                  </li>
                )}

                <li className="border-dashed border-b border-dashed-dark py-2">
                  <div className="flex justify-between pr-6 text-xs relative">
                    <div>
                      <p>{ellipsis(String(tx.txid), 4, 14)}</p>

                      <p
                        className={
                          isConfirmed
                            ? 'text-warning-success'
                            : 'text-yellow-300'
                        }
                      >
                        {isConfirmed ? 'Confirmed' : 'Pending'}
                      </p>
                    </div>

                    <div className="flex justify-self-end">
                      <div className="mr-6 text-right">
                        <p className="text-blue-300">{timestamp}</p>

                        <p>{getTxType(tx)}</p>
                      </div>

                      <IconButton
                        className="w-1"
                        onClick={() =>
                          navigate('/home-tx-details/', {
                            state: {
                              tx,
                              type: getTxType(tx),
                              assetGuid: null,
                              assetType: null,
                            },
                          })
                        }
                      >
                        <Icon name="select" className="text-base" />
                      </IconButton>
                    </div>
                  </div>
                </li>
              </Fragment>
            );
          })}
        </ul>
      )}

      {assets && (
        <ul className="pb-4">
          {data.map((asset: Assets) => {
            if (asset.assetGuid && asset.balance > 0) {
              return (
                <li
                  key={asset.assetGuid}
                  className="border-dashed border-b border-dashed-dark py-3 flex justify-between items-center text-xs"
                >
                  <p className="font-rubik">
                    {formatCurrency(
                      String(asset.balance / 10 ** asset.decimals),
                      asset.decimals
                    )}

                    <span className="font-poppins text-button-secondary">
                      {`  ${asset.symbol}`}
                    </span>
                  </p>

                  <IconButton
                    onClick={() =>
                      navigate('/home-tx-details', {
                        state: {
                          tx: null,
                          type: null,
                          assetGuid: asset.assetGuid,
                          assetType: asset.type,
                        },
                      })
                    }
                  >
                    <Icon name="select" className="w-4 text-brand-white" />
                  </IconButton>
                </li>
              );
            }

            return null;
          })}
        </ul>
      )}
    </>
  );
};
