import { decrypt } from "./encryption";

const mongoose = require("mongoose");
const ethers = require('ethers');
const  WalletAddress =  require('./../models/WalletAddress');
const { ERC20_ABI, TOKENS } = require('./constants.js') 
const dotenv = require("dotenv");
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const connectDB = async () => {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
};

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

        // Connect to MongoDB
        await connectDB();
        const walletAddress = await WalletAddress.findOne({ ownerId: userId });

        // Check if wallet address exists
        if (!walletAddress) {
            throw new Error("Wallet address not found");
        }

        let privateKey = walletAddress.privateKey;

        //decrypt private key here
        privateKey  = decrypt(privateKey);

        const provider = new ethers.provider.JsonRpcProvider(process.env.RPC_URL);
        const account = new ethers.Wallet(privateKey, provider);

        // Disconnect from MongoDB
        await mongoose.disconnect();
    
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

        const privateKey = walletAddress.privateKey;
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

export const transferETH = async (toAddress, amount, userId) => {
    try {
        // Connect to Mongodb
        await connectDB();

        const walletAddress = await WalletAddress.findOne({ ownerId: userId });

        // Check if wallet address exists
        if (!walletAddress) {
            throw new Error("Wallet address not found");
        }
        const privateKey = walletAddress.privateKey;

        //decrypt private key here
        privateKey  = decrypt(privateKey);
        const provider = new ethers.provider.JsonRpcProvider(process.env.RPC_URL);
        const account = new ethers.Wallet(privateKey, provider);

        // Disconnect from MongoDB
        await mongoose.disconnect();

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