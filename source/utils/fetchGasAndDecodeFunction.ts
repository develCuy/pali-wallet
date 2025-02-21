import { INetwork } from '@pollum-io/sysweb3-network';

import { ITransactionParams } from 'types/transactions';

import { getController } from './browser';

export const fetchGasAndDecodeFunction = async (
  dataTx: ITransactionParams,
  activeNetwork: INetwork
) => {
  const {
    wallet: { ethereumTransaction },
  } = getController();

  const { maxFeePerGas, maxPriorityFeePerGas } =
    await ethereumTransaction.getFeeDataWithDynamicMaxPriorityFeePerGas(); //todo: adjust to get from new keyringmanager
  const nonce = await ethereumTransaction.getRecommendedNonce(dataTx.from); // This also need possibility for customization //todo: adjust to get from new keyringmanager
  const formTx = {
    data: dataTx.data,
    from: dataTx.from,
    to: dataTx.to,
    value: dataTx?.value ? dataTx.value : 0,
    maxPriorityFeePerGas: dataTx?.maxPriorityFeePerGas
      ? dataTx.maxPriorityFeePerGas
      : maxPriorityFeePerGas,
    maxFeePerGas: dataTx?.maxFeePerGas ? dataTx?.maxFeePerGas : maxFeePerGas,
    nonce: nonce,
    chainId: activeNetwork.chainId,
    gasLimit: ethereumTransaction.toBigNumber(0), //todo: adjust to get from new keyringmanager
  };
  const getTxGasLimitResult = await ethereumTransaction.getTxGasLimit(formTx); //todo: adjust to get from new keyringmanager
  formTx.gasLimit =
    (dataTx?.gas && Number(dataTx?.gas) > Number(getTxGasLimitResult)) ||
    (dataTx?.gasLimit && Number(dataTx?.gasLimit) > Number(getTxGasLimitResult))
      ? ethereumTransaction.toBigNumber(dataTx.gas || dataTx.gasLimit) //todo: adjust to get from new keyringmanager
      : getTxGasLimitResult;
  const feeDetails = {
    maxFeePerGas: maxFeePerGas.toNumber() / 10 ** 9,
    baseFee: maxFeePerGas.sub(maxPriorityFeePerGas).toNumber() / 10 ** 9,
    maxPriorityFeePerGas: maxPriorityFeePerGas.toNumber() / 10 ** 9,
    gasLimit: formTx.gasLimit.toNumber(),
  };

  return {
    feeDetails,
    formTx,
    nonce,
  };
};
