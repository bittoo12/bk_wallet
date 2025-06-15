import { ERC20_ABI } from '../utils/constants.js';
import {
  getHomeScreenData,
  sendCrypto as sendCryptoService,
  getTransactionById as getTxById,
  getTransactionHistoryAll ,
  getNFTs,
} from '../services/walletService.js';

export const homeScreen = async (req, res) => {
  try {
    const userId = req.user?._id;
    const result = await getHomeScreenData(userId);
    return res.status(200).json({
      success: true,
      message: "Data retrieved successfully",
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
      error: err.message
    });
  }
};

export const sendCrypto = async (req, res) => {
  try {
    const userId = req.user?._id;
    const {  to, amount, chain, type, tokenAddress } = req.body;
    const result = await sendCryptoService( to, amount, chain, type, userId, tokenAddress);
    return res.status(200).json({
      success: true,
      message: "Transaction successful",
      data: result
    });
  } catch (err) {
    console.log("error always under ->>",err);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
      error: err.message
    });
  }
};

export const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getTxById(id);
    return res.status(200).json({
      success: true,
      message: "Transaction fetched successfully",
      data: result
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
      error: err.message
    });
  }
};

export const getTransactionHistory = async (req, res) => {
  try {

    
    const userId = req.user?._id;
    

  

    const result = await getTransactionHistoryAll(userId);
    return res.status(200).json({
      success: true,
      message: "Transaction history fetched successfully",
      data: result
    });
  } catch (err) {
    console.error('Controller Error:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Internal server error',
    });
  }
};

export const getMyNFTs = async (req, res) => {
  try {
    const { address } = req.params;
    const result = await getNFTs(address);
    return res.status(200).json({
      success: true,
      message: "NFTs retrieved successfully",
      data: result
    });
  } catch (err) {
    console.error('Error in getMyNFTs controller:', err.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
      error: err.message
    });
  }
};
