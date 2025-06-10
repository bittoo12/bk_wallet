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

  const owner = await WalletOwner.create({
    userId,
    walletAddress: wallet.address,
    privateKey: encryptedPrivateKey,
    mnemonic,
  });

  const hdNode = ethersUtils.HDNode.fromMnemonic(mnemonic);
  const wallet_2 = new Wallet(hdNode.privateKey);
  const encryptedPrivateKey_2 = encrypt(wallet.privateKey);
  const qrCode = await generateQRCode(wallet.address);

  await WalletAddress.create({
    ownerId: owner._id,
    userId: owner.userId,
    address: wallet_2.address,
    privateKey: encryptedPrivateKey_2,
    derivationPath: `m/44'/60'/0'/0/0`,
    index: 0,
    qrCodeBase64: qrCode,
  });
};

export { createInitialWallet };
