import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  homeScreen,
  sendCrypto,
  getTransactionById,
  getTransactionHistory,
  getMyNFTs,
} from '../controllers/walletController.js';

const router = express.Router();

router.get('/home',authMiddleware, homeScreen);
router.post('/send', authMiddleware, sendCrypto);
router.get('/transaction/:id', getTransactionById);
router.get('/history/',authMiddleware, getTransactionHistory);
router.get('/nfts/:address', getMyNFTs);

export default router;
