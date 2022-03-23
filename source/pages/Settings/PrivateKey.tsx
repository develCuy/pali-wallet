import React, { useState } from 'react';
import { useUtils } from 'hooks/index';
import { ellipsis, getController, showSuccessAlert } from 'utils/index';
import { Layout, Icon, Card, CopyCard } from 'components/index';
import { Input, Form } from 'antd';

const PrivateKeyView = () => {
  const controller = getController();
  const activeAccount = controller.wallet.account.getActiveAccount();

  const { useCopyClipboard, alert } = useUtils();

  const [copied, copyText] = useCopyClipboard();
  const [valid, setValid] = useState<boolean>(false);

  const sysExplorer = controller.wallet.account.getSysExplorerSearch();

  return (
    <Layout title="YOUR KEYS">
      <div className="scrollbar-styled px-2 py-5 h-96 overflow-auto">
        <Card type="info">
          <p>
            <b className="text-warning-info">WARNING: </b>
            This is your account root indexer to check your full balance for{' '}
            {activeAccount?.label}, it isn't a receiving address. DO NOT SEND
            FUNDS TO THESE ADDRESSES, YOU WILL LOOSE THEM!
          </p>
        </Card>

        <CopyCard
          className="my-4"
          onClick={() => copyText(String(activeAccount?.xpub))}
          label="Your XPUB"
        >
          <p>{ellipsis(activeAccount?.xpub, 4, 16)}</p>
        </CopyCard>

        <p className="ml-8 my-5 text-xs sm:text-center md:ml-0">
          To see your private key, input your password
        </p>

        <Form
          className="password mx-auto my-3 w-80 max-w-xl text-center sm:w-full"
          name="phraseview"
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 16 }}
          autoComplete="off"
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
                validator(_, value) {
                  if (controller.wallet.getPhrase(value)) {
                    setValid(true);

                    return Promise.resolve();
                  }

                  return Promise.reject();
                },
              }),
            ]}
          >
            <Input.Password placeholder="Enter your password" />
          </Form.Item>
        </Form>

        <CopyCard
          className="my-3"
          onClick={
            valid ? () => copyText(String(activeAccount?.xprv)) : undefined
          }
          label="Your private key"
        >
          <p>
            {valid
              ? ellipsis(activeAccount?.xprv, 4, 16)
              : '********...************'}
          </p>
        </CopyCard>

        <Form
          className="password flex flex-col gap-8 items-center justify-center my-3 w-full max-w-xs text-center md:max-w-md"
          name="phraseview"
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 16 }}
          autoComplete="off"
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
                validator(_, value) {
                  if (controller.wallet.getPhrase(value)) {
                    setValid(true);

                    return Promise.resolve();
                  }

                  return Promise.reject();
                },
              }),
            ]}
          >
            <Input.Password placeholder="Enter your password" />
          </Form.Item>
        </Form>

        <CopyCard
          onClick={
            valid ? () => copyText(String(activeAccount?.xprv)) : undefined
          }
          label="Your private key"
        >
          <p>
            {valid
              ? ellipsis(activeAccount?.xprv, 4, 16)
              : '********...************'}
          </p>
        </CopyCard>

        <div
          className="flex gap-2 items-center justify-center mt-4 hover:text-brand-royalblue text-xs cursor-pointer"
          onClick={() =>
            window.open(`${sysExplorer}/xpub/${activeAccount?.xpub}`)
          }
        >
          <p>View account on explorer</p>

          <Icon name="select" className="mb-1" />
        </div>
      </div>

      {showSuccessAlert(copied, 'Key succesfully copied', alert)}
    </Layout>
  );
};

export default PrivateKeyView;
