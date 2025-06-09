const axios = require('axios');



async function getNativeAndErcTokenBalance(address){
  const url = `https://deep-index.moralis.io/api/v2.2/wallets/${address}/tokens?chain=eth`;
  
  try {
    const response = await axios.get(url, {
      headers: {
        accept: 'application/json',
        'X-API-Key': apiKey,
      },
    });

    if (!response.data || !response.data.result) {
      throw new Error('Invalid response structure from Moralis API');
    }

   return  response.data.result
  } catch (error) {
    if (error.response) {
      // Server responded with a status code outside 2xx
      console.error(
        `API Error: ${error.response.status} - ${error.response.statusText}`
      );
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      // No response received
      console.error('No response received from Moralis API:', error.request);
    } else {
      // Other errors
      console.error('Error:', error.message);
    }
    throw error; // re-throw after logging
  }
}



// Get home screen data (tokens, NFTs, transactions)
exports.getHomeScreenData = async (address) => {

  //Get Native & ERC20 Token Balances by Wallet : chain : eth

 const balances = await getNativeAndErcTokenBalance(address);

 const transactions = await getTransactionHistory(address);

 return {
  balances,
  transactions
 }
   
  
  
};

// Send ETH from one address to another using private key
exports.sendCrypto = async (privateKey, to, amount, chain = process.env.chain) => {
};

// Get transaction details by hash
exports.getTransactionById = async (txHash) => {
};



exports.getTransactionHistory = async (address, chain = process.env.CHAIN || 'eth', filter = 'all') => {
  let ethObj = {};
  let tronObj = {};

  try {
    if (chain === 'eth' ) {
      const response = await axios.get(`https://deep-index.moralis.io/api/v2.2/wallets/${address}/history`, {
        headers: {
          'X-API-Key': process.env.MORALIS_API_KEY,
          accept: 'application/json',
        },
        params: {
          chain: 'eth',
          order: 'DESC',
        },
      });

      ethObj = response.data;
    }
  } catch (error) {
    console.error('Ethereum Error:', error.response?.data || error.message);
    throw new Error('Failed to fetch Ethereum wallet history');
  }

  try {
    if (chain === 'tron') {
      // Placeholder Tron response, replace with TronGrid or real API
      tronObj = {
        message: 'Tron support not implemented yet',
        transactions: [],
      };
    }
  } catch (error) {
    console.error('Tron Error:', error.response?.data || error.message);
    throw new Error('Failed to fetch Tron wallet history');
  }

  return {
    success: true,
    data: {
      eth: ethObj,
      tron: tronObj,
    },
  };
};


// Fetch NFTs
exports.getNFTs = async (address, chain = 'eth') => {
  try {
    const response = await axios.get(
      `https://deep-index.moralis.io/api/v2.2/${address}/nft/transfers`,
      {
        headers: {
          'X-API-Key': process.env.MORALIS_API_KEY,
          accept: 'application/json',
        },
        params: {
          chain,
          format: 'decimal',
          order: 'DESC',
        },
      }
    );

    const erc1155NFTs = response.data.result.filter(nft => nft.contract_type === 'ERC1155');
    return erc1155NFTs;
  } catch (error) {
    console.error('Moralis NFT API Error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || 'Failed to fetch NFT transfer history'
    );
  }
};

