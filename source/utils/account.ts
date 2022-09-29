import { IKeyringAccountState } from '@pollum-io/sysweb3-keyring';

import { IVaultState, IOmittedVault, IOmmitedAccount } from 'state/vault/types';

export const removeXprv = (account: IKeyringAccountState): IOmmitedAccount => {
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  const { xprv, ...remainingInfo } = account;

  return remainingInfo;
};

export const removeSensitiveDataFromVault = (
  vault: IVaultState
): IOmittedVault => {
  const accounts = {};

  for (const account of Object.values(vault.accounts)) {
    accounts[account.id] = removeXprv(account);
  }

  return {
    ...vault,
    accounts,
  };
};
