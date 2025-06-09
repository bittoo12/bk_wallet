const express = require("express");
const router = express.Router();
const {authMiddleware} = require('./../middleware/authMiddleware')
const {homeScreen,sendCrypto,getTransactionById,getTransactionHistory,getMyNFTs} = require('./../controllers/walletController')


router.post('/home',  homeScreen);
router.post('/send', authMiddleware, sendCrypto);
router.get('/transaction/:id',  getTransactionById);
router.get('/history/:address',  getTransactionHistory);
router.get('/nfts/:address',  getMyNFTs);


module.exports = router;