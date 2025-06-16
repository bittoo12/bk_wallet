import express from 'express';
import WalletOwner from './../models/WalletOwner.js';
import WalletAddress from './../models/WalletAddress.js';
import { ethers,Wallet } from 'ethers';
import QRCode from 'qrcode';
import { encrypt, decrypt } from './encryption.js';
import {TronWeb} from 'tronweb';

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
export const createAddressForOwner = async (ownerId, index) => {
  // const owner = await WalletOwner.findById(ownerId);
  // if (!owner) {
  //   throw new Error('Wallet owner not found');
  // }
  const existing = await WalletOwner.findOne({ userId:ownerId });
  if (existing) {
    console.log('Wallet already exists.');
    return;
  }

  const wallet = Wallet.createRandom();
  const mnemonic = wallet.mnemonic.phrase;
  const encryptedPrivateKey = encrypt(wallet.privateKey);



  // const wallet = new ethers.Wallet(hdNode.privateKey);
  // const mnemonic = wallet.mnemonic.phrase;
  const hdNode = ethers.utils.HDNode.fromMnemonic(mnemonic);
  // const encryptedPrivateKey = encrypt(wallet.privateKey);
  const qrCode = await generateQRCode(wallet.address);



const tronWeb = new TronWeb({
    fullHost: "https://nile.tronscanapi.com"    // Testnet rpc url
});
// Create new Tron account
const account = await tronWeb.createAccount();
const encryptedPrivateKeyTron = await encrypt(account.privateKey);

const owner = await WalletOwner.create({
  userId:ownerId,
  walletAddressEth: wallet.address,//eth
  privateKeyEth: encryptedPrivateKey,//eth
  mnemonic,
  walletAddressTron:account.address.base58,//tron
  privateKeyTron:encryptedPrivateKeyTron//tron
});

  await WalletAddress.create({
    ownerId : owner._id,
    userId: owner.userId,
    ethAddress: wallet.address,//eth
    privateKeyEth: encryptedPrivateKey,//eth
    derivationPath: `m/44'/60'/0'/0/${index}`,
    index,
    qrCodeBase64: qrCode,
    tronAddress : account.address.base58,//tron
    privateKeyTron : encryptedPrivateKeyTron//tron
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



  // tron address creation

  const tronWeb = new TronWeb({
    fullHost: "https://nile.tronscanapi.com"    // Testnet rpc url
});
// Create new Tron account
const account = await tronWeb.createAccount();


const encryptedPrivateKeyTron = await encrypt(account.privateKey);

const qrCodeEth = await generateQRCode(wallet.address);
const qrCodeTron =  await generateQRCode(account.address.base58);

  try {
    const w_address = await WalletAddress.create({
      ownerId: owner._id,
      userId: userId,
      ethAddress: wallet.address,
      privateKeyEth: encryptedPrivateKey,
      derivationPath: `m/44'/60'/0'/0/${nextIndex}`,
      index: nextIndex,
      tronAddress : account.address.base58,
      privateKeyTron : encryptedPrivateKeyTron,
      qrCodeBaseTron : qrCodeTron,
      qrCodeBaseEth : qrCodeEth
    });

    console.log(w_address);
  } catch (err) {
    console.error(err);
  }
};


// export const createTronAddress = async (userId) => {
//   try {
      
//       const tronWeb = new TronWeb({
//           fullHost: "https://nile.tronscanapi.com"    // Testnet rpc url
//       });

//       // Create new Tron account
//       const account = await tronWeb.createAccount();
//       console.log("Generated Tron address:", account.address.base58);

//       // Encrypt the private key before saving
//       const encryptedPrivateKey = await encrypt(account.privateKey);

//       // Save the address to database
//       const address = await WalletAddress.update(
//         {userId : userId},
//         { $set: { tronAddress: account.address.base58,
//         privateKeyTron : encryptedPrivateKey } },
//       )

//       console.log("New Tron wallet address created: and updated", address);
//   } catch (error) {
//       console.error("Error in createTronAddress:", error);
//       throw error;
//   }
// };