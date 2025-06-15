import express from 'express';
import { Wallet } from 'ethers';
import { utils as ethersUtils } from 'ethers';
import QRCode from 'qrcode';

import WalletOwner from '../models/WalletOwner.js';
import WalletAddress from '../models/WalletAddress.js';
import { encrypt } from './encryption.js';

const generateQRCode = async (walletAddress) => {
  try {
    const qrDataURL = await QRCode.toDataURL(walletAddress);
    return qrDataURL;
  } catch (err) {
    console.error('QR Generation Error:', err.message);
    throw new Error('Failed to generate QR Code');
  }
};

const createInitialWallet = async (userId) => {
  const existing = await WalletOwner.findOne({ userId });
  if (existing) {
    console.log('Wallet already exists.');
    return;
  }

  const wallet = Wallet.createRandom();
  const mnemonic = wallet.mnemonic.phrase;
  const encryptedPrivateKey = encrypt(wallet.privateKey);

  // const owner = await WalletOwner.create({
  //   userId,
  //   walletAddressEth: wallet.address,
  //   privateKeyEth: encryptedPrivateKey,
  //   mnemonic,
  //   walletAddressTron:,
  //   privateKeyTron:
  // });


};

export { createInitialWallet };
