import { ethers } from 'ethers';
import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import { Layout, DefaultModal, Button, Icon } from 'components/index';
import { useQueryData, useUtils } from 'hooks/index';
import { RootState } from 'state/store';
import { ICustomFeeParams, IFeeState } from 'types/transactions';
import { dispatchBackgroundEvent, getController } from 'utils/browser';
import { logError, ellipsis, removeScientificNotation } from 'utils/index';

import { EditPriorityModal } from './EditPriorityModal';

export const SendNTokenTransaction = () => {
  const {
    refresh,
    wallet: { account },
  } = getController();

  const txs = account.eth.tx;

  const { alert, navigate } = useUtils();

  const activeNetwork = useSelector(
    (state: RootState) => state.vault.activeNetwork
  );
  const activeAccount = useSelector(
    (state: RootState) => state.vault.activeAccount
  );

  // when using the default routing, state will have the tx data
  // when using createPopup (DApps), the data comes from route params
  const { host, ...externalTx } = useQueryData();

  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [fee, setFee] = useState<IFeeState>();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [haveError, setHaveError] = useState<boolean>(false);
  const [customFee, setCustomFee] = useState<ICustomFeeParams>({
    isCustom: false,
    gasLimit: 0,
    maxPriorityFeePerGas: 0,
    maxFeePerGas: 0,
    gasPrice: 0,
  });

  const isExternal = Boolean(externalTx.external);

  const tx = externalTx.tx;

  const isLegacyTransaction = Boolean(tx.type);

  const validateCustomGasLimit = Boolean(
    customFee.isCustom && customFee.gasLimit > 0
  );

  const handleConfirm = async () => {
    const {
      balances: { ethereum },
    } = activeAccount;

    const balance = ethereum;

    if (activeAccount && balance > 0) {
      setLoading(true);

      try {
        if (isLegacyTransaction) {
          const getGasCorrectlyGasPrice = Boolean(
            customFee.isCustom && customFee.gasPrice > 0
          )
            ? customFee.gasPrice * 10 ** 9 // Calculate custom value to send to transaction because it comes without decimals, only 8 -> 10 -> 12
            : await txs.getRecommendedGasPrice();

          const { type, ...restTx } = tx; // REMOVE TYPE TO PREVENT TRANSACTION TYPE ERROR

          const response = await txs.sendFormattedTransaction({
            ...restTx,
            gasPrice: ethers.utils.hexlify(Number(getGasCorrectlyGasPrice)),
            gasLimit: txs.toBigNumber(
              validateCustomGasLimit ? customFee.gasLimit : fee.gasLimit
            ),
          });

          setConfirmed(true);
          setLoading(false);

          if (isExternal) dispatchBackgroundEvent(`nTokenTx.${host}`, response);

          return response;
        } else {
          const response = await txs.sendFormattedTransaction({
            ...tx,
            maxPriorityFeePerGas: ethers.utils.parseUnits(
              String(
                Boolean(
                  customFee.isCustom && customFee.maxPriorityFeePerGas > 0
                )
                  ? customFee.maxPriorityFeePerGas.toFixed(9)
                  : fee.maxPriorityFeePerGas.toFixed(9)
              ),
              9
            ),
            maxFeePerGas: ethers.utils.parseUnits(
              String(
                Boolean(customFee.isCustom && customFee.maxFeePerGas > 0)
                  ? customFee.maxFeePerGas.toFixed(9)
                  : fee.maxFeePerGas.toFixed(9)
              ),
              9
            ),
            gasLimit: txs.toBigNumber(
              validateCustomGasLimit
                ? customFee.gasLimit * 10 ** 9 // Multiply gasLimit to reach correctly decimal value
                : fee.gasLimit
            ),
          });

          setConfirmed(true);
          setLoading(false);

          if (isExternal) dispatchBackgroundEvent(`nTokenTx.${host}`, response);

          return response;
        }
      } catch (error: any) {
        logError('error', 'Transaction', error);

        alert.removeAll();
        alert.error("Can't complete transaction. Try again later.");

        if (isExternal) setTimeout(window.close, 4000);
        else setLoading(false);
        return error;
      }
    }
  };

  useEffect(() => {
    const abortController = new AbortController();

    const getFeeRecomendation = async () => {
      const { maxFeePerGas, maxPriorityFeePerGas } =
        await txs.getFeeDataWithDynamicMaxPriorityFeePerGas();

      const getTxGasLimitResult = await txs.getTxGasLimit(tx);

      tx.gasLimit =
        (tx?.gas && Number(tx?.gas) > Number(getTxGasLimitResult)) ||
        (tx?.gasLimit && Number(tx?.gasLimit) > Number(getTxGasLimitResult))
          ? txs.toBigNumber(tx.gas || tx.gasLimit)
          : getTxGasLimitResult;

      const feeDetails = {
        maxFeePerGas: tx?.maxFeePerGas
          ? Number(tx?.maxFeePerGas) / 10 ** 9
          : maxFeePerGas.toNumber() / 10 ** 9,
        baseFee:
          tx?.maxFeePerGas && tx?.maxPriorityFeePerGas
            ? (Number(tx.maxFeePerGas) - Number(tx.maxPriorityFeePerGas)) /
              10 ** 9
            : maxFeePerGas.sub(maxPriorityFeePerGas).toNumber() / 10 ** 9,
        maxPriorityFeePerGas: tx?.maxPriorityFeePerGas
          ? Number(tx.maxPriorityFeePerGas) / 10 ** 9
          : maxPriorityFeePerGas.toNumber() / 10 ** 9,
        gasLimit: tx?.gasLimit ? tx.gasLimit : getTxGasLimitResult,
        gasPrice: tx?.gasPrice ? Number(tx.gasPrice) / 10 ** 9 : 0,
      };

      setFee(feeDetails);
    };

    getFeeRecomendation();

    return () => {
      abortController.abort();
    };
  }, [tx]);

  const getCalculatedFee = useMemo(() => {
    if (!tx.gasPrice && !fee?.gasLimit && !fee?.maxFeePerGas) return;

    return isLegacyTransaction
      ? (Number(customFee.isCustom ? customFee.gasPrice : fee?.gasPrice) *
          Number(validateCustomGasLimit ? customFee.gasLimit : fee?.gasLimit)) /
          10 ** 9
      : (Number(
          customFee.isCustom ? customFee.maxFeePerGas : fee?.maxFeePerGas
        ) *
          Number(validateCustomGasLimit ? customFee.gasLimit : fee?.gasLimit)) /
          10 ** 9;
  }, [fee?.gasPrice, fee?.gasLimit, fee?.maxFeePerGas, customFee]);

  return (
    <Layout title="SEND" canGoBack={!isExternal}>
      <DefaultModal
        show={confirmed}
        title="Transaction successful"
        description="Your transaction has been successfully submitted. You can see more details under activity on your home page."
        onClose={() => {
          refresh(false);
          if (isExternal) window.close();
          else navigate('/home');
        }}
      />

      <DefaultModal
        show={haveError}
        title="Verify Fields"
        description="Change fields values and try again."
        onClose={() => setHaveError(false)}
      />

      <EditPriorityModal
        showModal={isOpen}
        setIsOpen={setIsOpen}
        customFee={customFee}
        setCustomFee={setCustomFee}
        setHaveError={setHaveError}
        fee={fee}
        isSendLegacyTransaction={isLegacyTransaction}
      />

      {tx.from && fee ? (
        <div className="flex flex-col items-center justify-center w-full">
          <p className="flex flex-col items-center justify-center text-center font-rubik">
            <span className="text-brand-royalblue font-poppins font-thin">
              Send
            </span>

            <span>
              {`${
                Number(tx.value) / 10 ** 18
              } ${' '} ${activeNetwork.currency?.toUpperCase()}`}
            </span>
          </p>

          <div className="flex flex-col gap-3 items-start justify-center w-full text-left text-sm divide-bkg-3 divide-dashed divide-y">
            <p className="flex flex-col pt-2 w-full text-brand-white font-poppins font-thin">
              From
              <span className="text-brand-royalblue text-xs">
                {ellipsis(tx.from, 7, 15)}
              </span>
            </p>

            <p className="flex flex-col pt-2 w-full text-brand-white font-poppins font-thin">
              To
              <span className="text-brand-royalblue text-xs">
                {ellipsis(tx.to, 7, 15)}
              </span>
            </p>

            <div className="flex flex-row items-center justify-between w-full">
              <p className="flex flex-col pt-2 w-full text-brand-white font-poppins font-thin">
                Estimated GasFee
                <span className="text-brand-royalblue text-xs">
                  {removeScientificNotation(getCalculatedFee)}{' '}
                  {activeNetwork.currency?.toUpperCase()}
                </span>
              </p>
              <span
                className="w-fit relative bottom-1 hover:text-brand-deepPink100 text-brand-royalblue text-xs cursor-pointer"
                onClick={() => setIsOpen(true)}
              >
                EDIT
              </span>
            </div>

            <p className="flex flex-col pt-2 w-full text-brand-white font-poppins font-thin">
              Total (Amount + gas fee)
              <span className="text-brand-royalblue text-xs">
                {`${
                  Number(tx.value) / 10 ** 18 + getCalculatedFee
                } ${activeNetwork.currency?.toLocaleUpperCase()}`}
              </span>
            </p>
          </div>

          <div className="flex items-center justify-around py-8 w-full">
            <Button
              type="button"
              className="xl:p-18 flex items-center justify-center text-brand-white text-base bg-button-secondary hover:bg-button-secondaryhover border border-button-secondary rounded-full transition-all duration-300 xl:flex-none"
              id="send-btn"
              onClick={() => {
                refresh(false);
                if (isExternal) window.close();
                else navigate('/home');
              }}
            >
              <Icon
                name="arrow-up"
                className="w-4"
                wrapperClassname="mb-2 mr-2"
                rotate={45}
              />
              Cancel
            </Button>

            <Button
              type="button"
              className="xl:p-18 flex items-center justify-center text-brand-white text-base bg-button-primary hover:bg-button-primaryhover border border-button-primary rounded-full transition-all duration-300 xl:flex-none"
              id="receive-btn"
              loading={loading}
              onClick={handleConfirm}
            >
              <Icon
                name="arrow-down"
                className="w-4"
                wrapperClassname="mb-2 mr-2"
              />
              Confirm
            </Button>
          </div>
        </div>
      ) : null}
    </Layout>
  );
};
