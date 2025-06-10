import express from 'express';
import WalletOwner from './../models/WalletOwner.js';
import WalletAddress from './../models/WalletAddress.js';
import { ethers } from 'ethers';
import QRCode from 'qrcode';
import { encrypt, decrypt } from './encryption.js';

const app = express();

const generateQRCode = async (walletAddress) => {
  try {
    const qrDataURL = await QRCode.toDataURL(walletAddress);
    return qrDataURL;
  } catch (err) {
    console.error('QR Generation Error:', err.message);
    throw new Error('Failed to generate QR Code');
  }
};

// Create new address using mnemonic + index
export const createAddressForOwner = async (ownerId, mnemonic, index) => {
  const owner = await WalletOwner.findById(ownerId);
  if (!owner) {
    throw new Error('Wallet owner not found');
  }

  const hdNode = ethers.utils.HDNode.fromMnemonic(mnemonic);
  const wallet = new ethers.Wallet(hdNode.privateKey);
  const encryptedPrivateKey = encrypt(wallet.privateKey);
  const qrCode = await generateQRCode(wallet.address);

  await WalletAddress.create({
    ownerId,
    userId: owner.userId,
    address: wallet.address,
    privateKey: encryptedPrivateKey,
    derivationPath: `m/44'/60'/0'/0/${index}`,
    index,
    qrCodeBase64: qrCode,
  });

  console.log(`Address ${index} generated and saved: ${wallet.address}`);
};

// Generate next address from current index
export const generateNextAddress = async (ownerId, userId) => {
  const owner = await WalletOwner.findOne({ userId: ownerId });

  if (!owner) {
    console.log('Admin wallet not found.');
    return;
  }

  const latest = await WalletAddress.find().sort({ index: -1 }).limit(1);
  const nextIndex = latest.length ? latest[0].index + 1 : 0;

  const hdRoot = ethers.utils.HDNode.fromMnemonic(owner.mnemonic);
  const childNode = hdRoot.derivePath(`m/44'/60'/0'/0/${nextIndex}`);
  const wallet = new ethers.Wallet(childNode.privateKey);
  const encryptedPrivateKey = encrypt(wallet.privateKey);
  const qrCode = await generateQRCode(wallet.address);

  try {
    const w_address = await WalletAddress.create({
      ownerId: owner._id,
      userId: userId,
      address: wallet.address,
      privateKey: encryptedPrivateKey,
      derivationPath: `m/44'/60'/0'/0/${nextIndex}`,
      index: nextIndex,
      qrCodeBase64: qrCode,
    });

    console.log(w_address);
  } catch (err) {
    console.error(err);
  }
};
