const express = require("express");
const app = express();
const ethers = require('ethers');
const WalletOwner = require('./../models/WalletOwner');
const {createAddressForOwner} = require('./../utils/addressCreator')
const WalletAddress = require('./../models/WalletAddress');
const {encrypt} = require('./encryption');
const QRCode = require('qrcode');


const generateQRCode = async (walletAddress) => {
  try {
    const qrDataURL = await QRCode.toDataURL(walletAddress);
    return qrDataURL; // Base64 image string
  } catch (err) {
    console.error('QR Generation Error:', err.message);
    throw new Error('Failed to generate QR Code');
  }
};


/// @note: Function to create an initial wallet for ADMIN purpose
/// Also creates the first address
/// Should be used to bear gas fees for admin and hold NFTs
/// @param {string} userId - admin user ID
const createInitialWallet = async (userId) => {
  //userid : Admin
  const existing = await WalletOwner.findOne({ userId });
  if (existing) {
      console.log("Wallet already exists.");
      return;
  }

  // Create a new wallet with mnemonic
  const wallet = ethers.Wallet.createRandom();
  const mnemonic = wallet.mnemonic.phrase;

  // Encrypt the private key before saving
  const encryptedPrivateKey = encrypt(wallet.privateKey);

  // Create the wallet owner with all required fields
  const owner = await WalletOwner.create({
      userId,
      walletAddress: wallet.address,
      privateKey: encryptedPrivateKey,
      mnemonic
  });

  // const derivationPath = `m/44'/60'/0'/0/${index}`;
  // const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic);
  const hdNode = ethers.utils.HDNode.fromMnemonic(mnemonic);

   // const derivationPath = `m/44'/60'/0'/0/${index}`;
   const wallet_2 = new ethers.Wallet(hdNode.privateKey);

   // Encrypt the private key before saving
   const encryptedPrivateKey_2 = encrypt(wallet.privateKey);
   const qrCode = await generateQRCode(wallet.address);
   await WalletAddress.create({
       ownerId:owner._id,
       userId: owner.userId,
       address: wallet_2.address,
       privateKey: encryptedPrivateKey_2,
       derivationPath: `m/44'/60'/0'/0/${0}`,
       index:0,
       qrCodeBase64: qrCode,
   });
};


module.exports = {
  createInitialWallet :createInitialWallet
}