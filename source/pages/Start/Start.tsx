import { Form, Input } from 'antd';
import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import LogoImage from 'assets/images/logo-s.svg';
import { PrimaryButton } from 'components/index';
import { useUtils } from 'hooks/index';
import { RootState } from 'state/store';
import { getController } from 'utils/browser';

export const Start = (props: any) => {
  const { navigate } = useUtils();
  const {
    wallet: { unlock },
  } = getController();
  const { lastLogin } = useSelector((state: RootState) => state.vault);

  const { isExternal, externalRoute } = props;

  const getStarted = (
    <>
      <PrimaryButton type="submit" onClick={() => navigate('/create-password')}>
        Get started
      </PrimaryButton>

      <Link
        className="mt-20 hover:text-brand-graylight text-brand-royalbluemedium font-poppins text-base font-light transition-all duration-300"
        to="/import"
        id="import-wallet-link"
      >
        Import using wallet seed phrase
      </Link>
    </>
  );

  const onSubmit = async ({ password }: { password: string }) => {
    await unlock(password);
    if (!isExternal) return navigate('/home');
    return navigate(externalRoute);
  };

  const unLock = (
    <>
      <Form
        validateMessages={{ default: '' }}
        className="flex flex-col gap-8 items-center justify-center w-full max-w-xs text-center md:max-w-md"
        name="basic"
        onFinish={onSubmit}
        autoComplete="off"
        id="login"
      >
        <Form.Item
          name="password"
          hasFeedback
          className="w-full"
          rules={[
            {
              required: true,
              message: '',
            },
            () => ({
              async validator(_, value) {
                if (await unlock(value)) {
                  return Promise.resolve();
                }

                return Promise.reject();
              },
            }),
          ]}
        >
          <Input.Password
            className="input-small relative"
            placeholder="Enter your password"
          />
        </Form.Item>

        <PrimaryButton type="submit" id="unlock-btn">
          Unlock
        </PrimaryButton>
      </Form>
      <Link
        className="mt-10 hover:text-brand-graylight text-brand-royalblue text-base font-light transition-all duration-300"
        to="/import"
        id="import-wallet-link"
      >
        Import using wallet seed phrase
      </Link>
    </>
  );

  return (
    <div className="flex flex-col items-center justify-center p-2 pt-20 min-w-full">
      <p className="mb-2 text-center text-brand-deepPink100 text-lg font-normal tracking-wider">
        WELCOME TO
      </p>

      <h1 className="m-0 text-center text-brand-royalblue font-poppins text-4xl font-bold tracking-wide leading-4">
        Pali Wallet
      </h1>

      <img src={LogoImage} className="my-8 w-52" alt="syscoin" />

      {lastLogin ? unLock : getStarted}
    </div>
  );
};
