import React, { useEffect, useState } from 'react';
import placeholder from 'assets/images/placeholder.png';
import { Tooltip, Icon, IconButton } from 'components/index';
import { formatUrl } from 'utils/index';
import { useStore, useUtils } from 'hooks/index';
import axios from 'axios';

export const AssetDetails = ({
  assetType,
  assetData,
}: {
  assetData: any;
  assetType?: string;
}) => {
  const [imageLink, setImageLink] = useState('');
  const [loadingImage, setLoadingImage] = useState(false);

  const { activeNetwork, networks } = useStore();

  const { useCopyClipboard, alert } = useUtils();

  const [copied, copy] = useCopyClipboard();

  const isSyscoinChain = Boolean(networks.syscoin[activeNetwork.chainId]);

  const {
    assetGuid,
    contract,
    symbol,
    totalSupply,
    maxSupply,
    decimals,
    updateCapabilityFlags,
    description,
    name,
    contractAddress,
    id,
    marketCapRank,
    thumb: tokenThumb,
  } = assetData;

  useEffect(() => {
    const getImageLink = async () => {
      if (description && description.startsWith('https://ipfs.io/ipfs/')) {
        setLoadingImage(true);

        const response = await axios.get(description);

        setImageLink(response.data.image);
        setLoadingImage(false);
      }
    };

    if (isSyscoinChain) getImageLink();
  }, [activeNetwork, description]);

  useEffect(() => {
    if (!copied) return;

    alert.removeAll();
    alert.success('Contract successfully copied');
  }, [copied]);

  const sysAssetDetails = [
    {
      label: 'Asset Guid',
      value: assetGuid,
    },
    {
      label: 'Type',
      value: assetType,
    },
    {
      label: 'Contract',
      value: formatUrl(String(contract), 15),
    },
    {
      label: 'Symbol',
      value: symbol ? atob(String(symbol)) : '',
    },
    {
      label: 'Description',
      value: formatUrl(description, 15),
    },
    {
      label: 'Total supply',
      value: totalSupply / 10 ** Number(decimals),
    },
    {
      label: 'Max supply',
      value: maxSupply / 10 ** Number(decimals),
    },
    {
      label: 'Decimals',
      value: decimals,
    },
    {
      label: 'Capability flags',
      value: updateCapabilityFlags,
    },
  ];

  const ethAssetDetails = [
    {
      label: 'Icon',
      value: tokenThumb,
    },
    {
      label: 'ID',
      value: id,
    },
    {
      label: 'Name',
      value: name,
    },
    {
      label: 'Symbol',
      value: symbol,
    },
    {
      label: 'Decimals',
      value: decimals || '',
    },
    {
      label: contractAddress ? 'Contract' : '',
      value: contractAddress || '',
    },
    {
      label: 'Description',
      value: description ? formatUrl(String(description), 15) : '',
    },
    {
      label: 'Market Cap',
      value: marketCapRank || '',
    },
  ];

  const renderAssets = (detailsArray: { label: string; value: any }[]) =>
    detailsArray.map(({ label, value }: any) => (
      <>
        {label && value && (
          <div
            key={label}
            className="flex items-center justify-between my-1 px-6 py-2 w-full text-xs border-b border-dashed border-bkg-2 cursor-default transition-all duration-300"
          >
            {label === 'Icon' ? (
              <>
                <p>{label}</p>
                <img src={value} alt={description} />
              </>
            ) : label === 'Contract' ? (
              <>
                <p>{label}</p>
                <b>
                  {formatUrl(String(value), 15)}

                  {value && (
                    <IconButton
                      onClick={() => copy(value ?? '')}
                      type="primary"
                      shape="circle"
                      className="mt-3"
                    >
                      <Icon
                        name="copy"
                        className="text-xs"
                        id="copy-address-btn"
                      />
                    </IconButton>
                  )}
                </b>
              </>
            ) : (
              <>
                <p>{label}</p>
                <b>{value}</b>
              </>
            )}
          </div>
        )}
      </>
    ));

  return (
    <>
      {isSyscoinChain && (
        <>
          {imageLink && !loadingImage ? (
            <Tooltip content="Click to open on IPFS">
              <img
                src={`${imageLink}`}
                alt="syscoin"
                className="mb-8 mt-4 mx-auto w-40 h-40 rounded-md cursor-pointer transition-all duration-200"
                onClick={() => imageLink && window.open(imageLink)}
              />
            </Tooltip>
          ) : (
            <>
              {loadingImage ? (
                <div className="flex items-center justify-center h-40">
                  <Icon
                    name="loading"
                    className="text-brand-royalblue"
                    size={50}
                  />
                </div>
              ) : (
                <img
                  src={`${placeholder}`}
                  alt="syscoin"
                  className="mb-8 mt-4 mx-auto w-40 h-40 rounded-md cursor-not-allowed transition-all duration-200"
                />
              )}
            </>
          )}
        </>
      )}

      {renderAssets(isSyscoinChain ? sysAssetDetails : ethAssetDetails)}
    </>
  );
};
