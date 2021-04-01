import store from 'state/store';
import {
  createAccount,
  updateStatus,
  removeAccount,
  updateAccount,
  updateLabel,
  removeKeystoreInfo,
  updateTransactions,
} from 'state/wallet';
import IWalletState, {
  AccountType,
  IAccountState,
  Keystore
} from 'state/wallet/types';
import {
  IAccountInfo,
  ITransactionInfo,
  PendingTx,
  Transaction
} from '../../types';
import { sys } from 'constants/index';


export interface IAccountController {
  subscribeAccount: (HDsigner: any, blockExplorer: string) => Promise<string | null>;
  getPrimaryAccount: (pwd: string) => void;
  unsubscribeAccount: (index: number, pwd: string) => boolean;
  updateAccountLabel: (id: number, label: string) => void;
  addNewAccount: (label: string) => Promise<string | null>;
  removePrivKeyAccount: (id: number, password: string) => boolean;
  watchMemPool: () => void;
  getLatestUpdate: () => void;
  importPrivKeyAccount: (privKey: string, label: string) => { [assetId: string]: string } | null;
  isValidSYSAddress: (address: string) => boolean;
  getRecommendFee: () => number;
  getPrivKey: (id: number, pwd: string) => string | null;
  updateTxs: () => void;
  getTempTx: () => ITransactionInfo | null;
  updateTempTx: (tx: ITransactionInfo) => void;
  confirmTempTx: () => void;
  transfer: (sender: string, receiver: string, amount: number, fee: number | undefined) => any | null;
}

const AccountController = (actions: {
  checkPassword: (pwd: string) => boolean;
  importPrivKey: (privKey: string) => Keystore | null;
}): IAccountController => {
  let intervalId: any;
  let account: IAccountState;
  let password: string;
  let tempTx: ITransactionInfo | null;
  let backendUrl: string;

  const getAccountByPrivateKey = (): IAccountInfo => {
    // fixed account without private key (generated by password and seed phrase using syscoin)
    const balance = 200000;
    const transactions: Transaction[] = [];

    return {
      address: {
        main: '0x0',
      },
      balance,
      transactions,
    };
  };

  const getAccountByPrivKeystore = (keystoreId: number) => {
    const { keystores }: IWalletState = store.getState().wallet;

    if (!password || !keystores[keystoreId]) {
      return null;
    }

    return getAccountByPrivateKey();
  };

  const subscribeAccount = async (HDsigner: any, blockExplorer: string, label?: string) => {
    // const { accounts }: IWalletState = store.getState().wallet;
    // TODO: addapt this function to create new accounts as well check --> addNewAccount method in the class
    const account0 = HDsigner.accounts[0]
    backendUrl = blockExplorer;
    if (!account0 && HDsigner.accountIndex != 0) throw new Error("Error: account not created properly on wallet creation HDsigner object")
    console.log("The account xpub:", account0.getAccountPublicKey())
    let asset_information = await sys.utils.fetchBackendAccount(backendUrl, account0.getAccountPublicKey(), 'tokens=used&details=txs', true, HDsigner);

    console.log('syscoin backend output', asset_information)
    //TODO: get the 10 last transactions from the backend and pass to transaction buffer
    //TODO: balance for each SPT token
    account = {
      id: HDsigner.accountIndex,
      label: label || `Account ${HDsigner.accountIndex + 1}`,
      address: { 'assetId': 'ihihih' },
      balance: asset_information.balance,
      transactions: [],
      type: AccountType.Seed,
      xpub: HDsigner.getAccountXpub(),
      assets: {
        'lalala': {
          name: 'BagiImoveis',
          balance: 9999999
        }
      },
    };

    store.dispatch(createAccount(account));

    return account!.xpub;
  };

  const unsubscribeAccount = (index: number, pwd: string) => {
    if (actions.checkPassword(pwd)) {
      store.dispatch(removeAccount(index));
      store.dispatch(updateStatus());

      return true;
    }

    return false;
  };

  const updateAccountLabel = (id: number, label: string) => {
    store.dispatch(updateLabel({ id, label }));
  };

  const addNewAccount = async (label: string) => {
    const { accounts }: IWalletState = store.getState().wallet;

    const seedAccounts = accounts.filter(
      (account) => account.type === AccountType.Seed
    );

    let idx = 1;

    if (idx === 1) {
      idx = seedAccounts.length;
    }

    return await subscribeAccount(idx + 1, label);
  };

  const removePrivKeyAccount = (id: number, pwd: string) => {
    if (!actions.checkPassword(pwd)) {
      return false;
    }

    store.dispatch(removeKeystoreInfo(id));
    store.dispatch(removeAccount(id));
    store.dispatch(updateStatus());

    return true;
  };

  const getLatestUpdate = () => {
    const { activeAccountId, accounts }: IWalletState = store.getState().wallet;

    if (!accounts[activeAccountId] || accounts[activeAccountId].type === undefined) {
      return;
    };

    const accLatestInfo = getAccountByPrivKeystore(activeAccountId);
    if (!accLatestInfo) return;
    account = accounts[activeAccountId];

    const memPool = ''; // get pending txs from syscoin
    if (memPool) {
      const pendingTxs = JSON.parse(memPool);
      pendingTxs.forEach((pTx: PendingTx) => {
        if (
          !account ||
          (account.address.main !== pTx.sender &&
            account.address.main !== pTx.receiver) ||
          accLatestInfo?.transactions.filter(
            (tx: Transaction) => tx.hash === pTx.hash
          ).length > 0
        )
          return;
        accLatestInfo!.transactions.unshift(_coventPendingType(pTx));
      });
    }

    store.dispatch(
      updateAccount({
        id: activeAccountId,
        balance: accLatestInfo.balance,
        transactions: accLatestInfo.transactions,
      })
    );
  };

  const getPrimaryAccount = (pwd: string) => {
    const { accounts, activeAccountId }: IWalletState = store.getState().wallet;

    if (!actions.checkPassword(pwd)) return;
    password = pwd;

    getLatestUpdate();

    if (!account && accounts) {
      account = accounts[activeAccountId];
      store.dispatch(updateStatus());
    }
  };

  const watchMemPool = () => {
    if (intervalId) {
      return;
    }

    intervalId = setInterval(() => {
      getLatestUpdate();

      const { activeAccountId, accounts }: IWalletState = store.getState().wallet;

      if (
        !accounts[activeAccountId] ||
        !accounts[activeAccountId].transactions ||
        !accounts[activeAccountId].transactions.filter(
          (tx: Transaction) => tx.fee === -1
        ).length
      ) {
        clearInterval(intervalId);
      }
    }, 30 * 1000);
  };

  const importPrivKeyAccount = (privKey: string, label: string) => {
    const keystore = label && actions.importPrivKey(privKey);

    if (!keystore) return null;

    const res = getAccountByPrivateKey();

    account = {
      id: 10,
      label: label,
      address: res!.address,
      balance: res!.balance,
      transactions: res!.transactions,
      type: privKey === 'private-key-account-priv'
        ? AccountType.PrivKey
        : AccountType.Seed,
      xpub: "myxpubhot",
      assets: {
        'lalala': {
          name: 'BagiImoveis',
          balance: 9999999
        }
      },

    };

    store.dispatch(createAccount(account));
    return account!.address;
  };

  const getPrivKey = (id: number, pwd: string) => {
    const { accounts }: IWalletState = store.getState().wallet;

    if (!account || !actions.checkPassword(pwd)) return null;

    if (accounts[id].type === AccountType.Seed) {
      return 'private-key-account-seed'; // generate private key using password and phrase
    }

    return 'private-key-account-priv'; // generate private key using password and phrase
  };

  const isValidSYSAddress = (address: string) => {
    if (address) { // validate sys address
      return true;
    }
    return false;
  };

  const getRecommendFee = () => {
    return 0.028;
  };

  const _coventPendingType = (pending: PendingTx) => {
    return {
      hash: pending.hash,
      amount: pending.amount,
      receiver: pending.receiver,
      sender: pending.sender,
      fee: -1,
      isDummy: true,
      timestamp: new Date(pending.timestamp).toISOString(),
      lastTransactionRef: {},
      snapshotHash: '',
      checkpointBlock: '',
    } as Transaction;
  };

  const updateTxs = () => {
    if (!account) {
      return;
    }

    const newTxs: Transaction[] = []; // get transactions request (syscoin)

    store.dispatch(
      updateTransactions({
        id: account.id,
        txs: [...account.transactions, ...newTxs],
      })
    );
  };

  const getTempTx = () => {
    return tempTx || null;
  };

  const updateTempTx = (tx: ITransactionInfo) => {
    tempTx = { ...tx };
    tempTx.fromAddress = tempTx.fromAddress.trim();
    tempTx.toAddress = tempTx.toAddress.trim();
  };

  const transfer = (sender: string, receiver: string, amount: number, fee: number | undefined) => {
    return {
      pendingTx: {
        timestamp: Date.now(),
        hash: 'hashString',
        amount,
        receiver,
        sender,
      },
      transactionInfo: {
        fromAddress: sender,
        toAddress: receiver,
        amount: amount,
        fee,
      }
    }
  }

  const confirmTempTx = () => {
    if (!account) {
      throw new Error("Error: Can't find active account info");
    }

    if (!tempTx) {
      throw new Error("Error: Can't find transaction info");
    }

    try {
      const { pendingTx, transactionInfo } = transfer(
        tempTx.fromAddress,
        tempTx.toAddress,
        tempTx.amount,
        tempTx.fee
      );

      console.log('pending transaction', pendingTx)
      console.log('transaction info', transactionInfo)

      store.dispatch(
        updateTransactions({
          id: account.id,
          txs: [_coventPendingType(pendingTx), ...account.transactions],
        })
      );

      tempTx = null;
      watchMemPool();
    } catch (error) {
      throw new Error(error);
    }
  };

  return {
    subscribeAccount,
    getPrimaryAccount,
    unsubscribeAccount,
    updateAccountLabel,
    addNewAccount,
    removePrivKeyAccount,
    getLatestUpdate,
    watchMemPool,
    importPrivKeyAccount,
    getTempTx,
    updateTempTx,
    confirmTempTx,
    getPrivKey,
    isValidSYSAddress,
    updateTxs,
    getRecommendFee,
    transfer
  };
};

export default AccountController;