

const {getHomeScreenData,sendCrypto,getTransactionById,getTransactionHistory,getNFTs} = require('./../services/walletService')



exports.homeScreen = async (req, res) => {
        try {
          const result = await getHomeScreenData(req.body.address);
          return res.status(200).json({
            success: true,
            message: "Data retrieved successfully",
            data : result
          });
          
        } catch (err) {
          // res.status(500).json({ error: err.message });
          return res.status(500).json({
            success: false,
            message: "Internal server error. Please try again later.",
            error: err.message
          });
        }
      };
      
      exports.sendCrypto = async (req, res) => {
        try {
          const { privateKey, to, amount, chain } = req.body;
          const result = await sendCrypto(privateKey, to, amount, chain);
          return res.status(200).json({
            success: true,
            message: "Data retrieved successfully",
            data : result
          });
        } catch (err) {
          // res.status(500).json({ error: err.message });
          return res.status(500).json({
            success: false,
            message: "Internal server error. Please try again later.",
            error: err.message
          });
        }
      };
      
      exports.getTransactionById = async (req, res) => {
        try {
          const { id } = req.params;
          const result = await getTransactionById(id);
          return res.status(200).json({
            success: true,
            message: "Data retrieved successfully",
            data : result
          });
        } catch (err) {
          // res.status(500).json({ error: err.message });
          return res.status(500).json({
            success: false,
            message: "Internal server error. Please try again later.",
            error: err.message
          });
        }
      };
      
      exports.getTransactionHistory = async (req, res) => {
        try {
          const { address } = req.params;
          const { chain, filter } = req.query;
      
          if (!address) {
            return res.status(400).json({ success: false, message: 'Wallet address is required' });
          }
      
          const result = await getTransactionHistory(address, chain, filter);
          return res.status(200).json({
            success: true,
            message: "Data retrieved successfully",
            data : result
          });
        } catch (err) {
          console.error('Controller Error:', err.message);
          return res.status(500).json({
            success: false,
            message: err.message || 'Internal server error',
          });
        }
      };
      
      exports.getMyNFTs = async (req, res) => {
        try {
          const { address } = req.params;
          const result = await getNFTs(address); // calling service
          return res.status(200).json({
            success: true,
            message: "Data retrieved successfully",
            data : result
          });
        } catch (err) {
          console.error('Error in getMyNFTs controller:', err.message);
          // res.status(500).json({ success: false, error: err.message });
          return res.status(500).json({
            success: false,
            message: "Internal server error. Please try again later.",
            error: err.message
          });
        }
      };