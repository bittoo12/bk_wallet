import mongoose, { disconnect } from 'mongoose';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { decrypt } from './encryption.js';
import WalletAddress from '../models/WalletAddress.js';
import { ERC20_ABI, TOKENS } from './constants.js';
import {TronWeb} from 'tronweb';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const connectDB = async () => {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
};


// USDC AND USDT
export const transferERC20Token = async (toAddress, amount, userId, tokenAddress) => {
    try {

        // Fetch token details
        const token = findTokenDetails(tokenAddress);

        // Check if token is valid
        if (!token) {
            throw new Error("Token not found");
        }

        // Check if token is ERC20
        if (token.type !== "ERC20") {
            throw new Error("Token is not ERC20");
        }


        const walletAddress = await WalletAddress.findOne({ ownerId: userId });

        // Check if wallet address exists
        if (!walletAddress) {
            throw new Error("Wallet address not found");
        }

        const privateKey = walletAddress.privateKeyEth;
        const provider = new ethers.provider.JsonRpcProvider(process.env.RPC_URL);
        const account = new ethers.Wallet(privateKey, provider);


    
        // Contract instance
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, account);

        const formattedAmount = ethers.utils.parseUnits(amount.toString(), token.decimals);

        // Check if the sender has enough balance
        const balance = await tokenContract.balanceOf(account.address);
        const formattedBalance = ethers.utils.formatUnits(balance, token.decimals);


        if (formattedBalance < formattedAmount) {
            throw new Error("Insufficient balance");
        }
    
        // Transfer tokens
        const tx = await tokenContract.transfer(toAddress, formattedAmount);
        await tx.wait();

        console.log(`Transferred ${formattedAmount} ${token.symbol} from ${account.address} to ${toAddress}`);
        return tx;

    } catch (error) {
        console.error("Error transferring tokens:", error);
        throw new Error("Token transfer failed");
    }
}

const findTokenDetails = (tokenAddress) => {
    const token = Object.values(TOKENS).find(token => token.address.toLowerCase() === tokenAddress.toLowerCase());
    if (!token) {
        throw new Error("Token not found");
    }
    console.log("Token details:", token);
    return token;
}

export const transferNFT = async (toAddress, tokenId, amount, userId) => {
    try {
        // Connect to Mongodb
        await connectDB();
        const walletAddress = await WalletAddress.findOne({ ownerId: userId });

        // Check if wallet address exists
        if (!walletAddress) {
            throw new Error("Wallet address not found");    
        }

        const privateKey = walletAddress.privateKeyEth;
        const provider = new ethers.provider.JsonRpcProvider(process.env.RPC_URL);
        const account = new ethers.Wallet(privateKey, provider);

        // Disconnect from MongoDB
        await mongoose.disconnect();

        // Contract instance
        const contractAddress = TOKENS.NFT.address;
        const abi = TOKENS.NFT.abi;
        const nftContract = new ethers.Contract(contractAddress, abi, account);

        // Transfer NFT
        const tx = await nftContract.safeTransferFrom(account.address, toAddress, tokenId, amount, "0x0");
        await tx.wait();

        console.log(`Transferred NFT with tokenId ${tokenId} from ${account.address} to ${toAddress}`);
        return tx;
        
    } catch (error) {
        console.error("Error transferring NFT:", error);
        throw new Error("NFT transfer failed");
        
    }
}


//ETH
export const transferETH = async (toAddress, amount, userId) => {
    try {


        const walletAddress = await WalletAddress.findOne({ ownerId: userId });

        // Check if wallet address exists
        if (!walletAddress) {
            throw new Error("Wallet address not found");
        }
        const privateKey = walletAddress.privateKeyEth;
        const provider = new ethers.provider.JsonRpcProvider(process.env.RPC_URL);
        const account = new ethers.Wallet(privateKey, provider);



        // Transfer ETH
        const tx = await account.sendTransaction({
            to: toAddress,
            value: ethers.utils.parseEther(amount.toString())
        });
        await tx.wait();

        console.log(`Transferred ${amount} ETH from ${account.address} to ${toAddress}`);
        
        return tx;
    }
    catch (error) {
        console.error("Error transferring ETH:", error);
        throw new Error("ETH transfer failed");
    }
}

/// @note: Transfer TRC20 tokens on Tron network
/// @param {string} toAddress - Recipient's Tron address
/// @param {number} amount - Amount of tokens to transfer
/// @param {string} userId - User ID of the sender
/// @param {string} tokenAddress - TRC20 token contract address

//USDT_TRON
export const transferTRC20Token = async (toAddress, amount, userId, tokenAddress) => {
    try {
        // Fetch token details
        const token = findTokenDetails(tokenAddress);
        if (!token) {
            throw new Error("Token not found");
        }

    

        // Add check to find wallet address and initialze "walletAddress"

        const walletAddress = await WalletAddress.findOne({ userId: userId });
        console.log("Wa;let address ->>>",walletAddress);
        console.log("toAddress->>",toAddress)
        // Check if wallet address exists
        if (!walletAddress) {
            throw new Error("Wallet address not found");
        }

        let privateKey = walletAddress.privateKeyTron;
        privateKey = decrypt(privateKey);



        // Initialize TronWeb
        const tronWeb = new TronWeb({
            // fullHost: "https://nile.trongrid.io" // Testnet
            fullHost :"https://api.shasta.trongrid.io"
        });

        // Decrypt private key
  
        tronWeb.setPrivateKey(privateKey);

        // Create contract instance
        const contract = await tronWeb.contract().at(tokenAddress);

        // Convert amount to proper decimals
        const formattedAmount = amount * Math.pow(10, token.decimals);

        // Check balance
        const balance = await contract.balanceOf(walletAddress.tronAddress).call();
        if (balance < formattedAmount) {
            throw new Error("Insufficient balance");
        }

        // Transfer tokens
        const tx = await contract.transfer(toAddress, formattedAmount).send();
        console.log(`Transferred ${amount} ${token.symbol} from ${walletAddress.tronAddress} to ${toAddress}`);
        
        return tx;
    } catch (error) {
        console.error("Error transferring TRC20 tokens:", error);
        throw error;
    }
};

/// @note: Transfer TRX (native token) on Tron network
/// @param {string} toAddress - Recipient's Tron address
/// @param {number} amount - Amount of TRX to transfer
/// @param {string} userId - User ID of the sender
//TRX
export const transferTRX = async (toAddress, amount, userId) => {
    try {
        // Connect to MongoDB
    

        // Add check to find wallet address and initialze "walletAddress"
        
        const walletAddress = await WalletAddress.findOne({ userId: userId });

        // Check if wallet address exists
        if (!walletAddress) {
            throw new Error("Wallet address not found");
        }

        let privateKey = walletAddress.privateKeyTron;
        privateKey = decrypt(privateKey);

   
   
        // Initialize TronWeb
        const tronWeb = new TronWeb({
            // fullHost: "https://nile.trongrid.io" // Testnet
            fullHost :"https://api.shasta.trongrid.io"
        });

        // Decrypt private key
    
        tronWeb.setPrivateKey(privateKey);

        // Convert amount to SUN (1 TRX = 1000000 SUN)
        const amountInSun = amount * 1000000;

        // Check balance
        const balance = await tronWeb.trx.getBalance(walletAddress.tronAddress);
        if (balance < amountInSun) {
            throw new Error("Insufficient balance");
        }

        // Transfer TRX
        const tx = await tronWeb.trx.sendTransaction(toAddress, amountInSun);
        console.log(`Transferred ${amount} TRX from ${walletAddress.tronAddress} to ${toAddress}`);
        
        return tx;
    } catch (error) {
        console.error("Error transferring TRX:", error);
        throw error;
    }
};