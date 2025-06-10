import mongoose from 'mongoose';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { decrypt } from './encryption.js';
import WalletAddress from '../models/WalletAddress.js';
import { ERC20_ABI, TOKENS } from './constants.js';

dotenv.config();

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
};

const findTokenDetails = (tokenAddress) => {
  const token = Object.values(TOKENS).find(token => token.address === tokenAddress);
  if (!token) {
    throw new Error('Token not found');
  }
  console.log('Token details:', token);
  return token;
};

const transferERC20Token = async (toAddress, amount, userId, tokenAddress) => {
  try {
    const token = findTokenDetails(tokenAddress);

    if (token.type !== 'ERC20') {
      throw new Error('Token is not ERC20');
    }

    const walletAddress = await WalletAddress.findOne({ userId });
    if (!walletAddress) throw new Error('Wallet address not found');

    const privateKey = decrypt(walletAddress.privateKey);
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    const account = new ethers.Wallet(privateKey, provider);
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, account);

    const balance = await tokenContract.balanceOf(account.address);
    const formattedBalance = ethers.utils.formatUnits(balance, token.decimals);

    if (Number(formattedBalance) < Number(amount)) {
      throw new Error('Insufficient balance');
    }

    const formattedAmount = ethers.utils.parseUnits(amount.toString(), token.decimals).toString();
    const tx = await tokenContract.transfer(toAddress, formattedAmount);
    await tx.wait();

    console.log(`Transferred ${formattedAmount} ${token.symbol} from ${account.address} to ${toAddress}`);
    return tx;
  } catch (error) {
    console.error('Error transferring tokens:', error.message);
    throw new Error(error.message);
  }
};

const transferNFT = async (toAddress, tokenId, amount, userId) => {
  try {
    await connectDB();
    const walletAddress = await WalletAddress.findOne({ ownerId: userId });
    if (!walletAddress) throw new Error('Wallet address not found');

    const privateKey = decrypt(walletAddress.privateKey);
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    const account = new ethers.Wallet(privateKey, provider);

    await mongoose.disconnect();

    const { address: contractAddress, abi } = TOKENS.NFT;
    const nftContract = new ethers.Contract(contractAddress, abi, account);
    const tx = await nftContract.safeTransferFrom(account.address, toAddress, tokenId, amount, '0x0');
    await tx.wait();

    console.log(`Transferred NFT tokenId ${tokenId} from ${account.address} to ${toAddress}`);
    return tx;
  } catch (error) {
    console.error('Error transferring NFT:', error.message);
    throw new Error('NFT transfer failed');
  }
};

const transferETH = async (toAddress, amount, userId) => {
  try {
    const walletAddress = await WalletAddress.findOne({ userId });
    if (!walletAddress) throw new Error('Wallet address not found');

    const privateKey = decrypt(walletAddress.privateKey);
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    const account = new ethers.Wallet(privateKey, provider);

    const tx = await account.sendTransaction({
      to: toAddress,
      value: ethers.utils.parseEther(amount.toString()),
    });
    await tx.wait();

    console.log(`Transferred ${amount} ETH from ${account.address} to ${toAddress}`);
    return tx;
  } catch (error) {
    console.error('Error transferring ETH:', error.message);
    throw new Error(error.message);
  }
};

export {
  transferETH,
  transferNFT,
  transferERC20Token,
};
