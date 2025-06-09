const express = require("express");
const app = express();
const WalletOwner = require('./../models/WalletOwner');
const WalletAddress = require('./../models/WalletAddress');
const {ethers} = require('ethers');
const QRCode = require('qrcode');
const {encrypt,decrypt} = require('./encryption')






const generateQRCode = async (walletAddress) => {
  try {
    const qrDataURL = await QRCode.toDataURL(walletAddress);
    return qrDataURL; // Base64 image string
  } catch (err) {
    console.error('QR Generation Error:', err.message);
    throw new Error('Failed to generate QR Code');
  }
};


/// @note: This function is used to create a new address using the same mnemonic
/// @param {string} ownerId - ID of the wallet owner
/// @param {string} mnemonic - mnemonic phrase of the wallet owner
/// @param {number} index - index for the new address
const createAddressForOwner = async (ownerId, mnemonic, index) => {
    // Get the owner to fetch userId
    const owner = await WalletOwner.findById(ownerId);
    if (!owner) {
        throw new Error("Wallet owner not found");
    }

    // const derivationPath = `m/44'/60'/0'/0/${index}`;
    // const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic);
    const hdNode = ethers.HDNode.fromMnemonic(mnemonic);
    const wallet = new ethers.Wallet(hdNode.privateKey);

    // Encrypt the private key before saving
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

    // console.log("wallet address created->>>",address);

    console.log(`Address ${index} generated and saved: ${wallet.address}`);
};


/// @note: This function generates the next address for a given user
const generateNextAddress = async (ownerId, userId) => {
//ownerId : Admin , userId : newly generated userId
        // Checks if the userId for admin wallet is valid
        const owner = await WalletOwner.findOne({ userId:ownerId });
        
        if(!owner) {
            console.log("Admin wallet not found.");
            return;
        }
    
        const latest = await WalletAddress.find()
            .sort({ index: -1 })
            .limit(1);
        console.log("latest is ",latest)
        const nextIndex = latest.length ? latest[0].index + 1 : 0;
        console.log("nextIndex->>",nextIndex)
        // await createAddressForOwner(userId, owner.mnemonic, nextIndex);
            // Get the owner to fetch userId

    // const derivationPath = `m/44'/60'/0'/0/${index}`;
  
    // const mnemonicObj = Mnemonic.fromPhrase(owner.mnemonic);
    // const hdRoot = ethers.HDNodeWallet.fromMnemonic(mnemonicObj);
    // const hdRoot = ethers.HDNode.fromMnemonic(mnemonicObj);
    const hdRoot = ethers.utils.HDNode.fromMnemonic(owner.mnemonic);
    const childNode = hdRoot.derivePath(`m/44'/60'/0'/0/${nextIndex}`);
    const wallet = new ethers.Wallet(childNode.privateKey);
    // Encrypt the private key before saving
    const encryptedPrivateKey = encrypt(wallet.privateKey);


    const qrCode = await generateQRCode(wallet.address);
   try {
   const w_address =  await WalletAddress.create({
        // ownerId,
        ownerId: owner._id,  
        userId:userId,
        address: wallet.address,
        privateKey: encryptedPrivateKey,
        derivationPath: `m/44'/60'/0'/0/${nextIndex}`,
        // nextIndex
        index: nextIndex  ,
        qrCodeBase64: qrCode,
    });

    console.log(w_address);
   }catch(err){
    console.log(err);
   }
    };


    module.exports = {
        generateNextAddress :generateNextAddress,
        createAddressForOwner : createAddressForOwner
      }