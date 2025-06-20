import axios from 'axios';
import { request, gql,GraphQLClient } from 'graphql-request';
import { transferERC20Token, transferETH ,transferTRX,transferTRC20Token} from '../utils/transfer-crypto.js';
const endpoint = 'https://streaming.bitquery.io/eap';
import WalletAddress from './../models/WalletAddress.js'
const graphQLClient = new GraphQLClient(endpoint, {
  headers: {
    Authorization: `Bearer ${process.env.GRAPHQL_TOKEN}` // or use an API key
    // Example: 'X-API-Key': process.env.MY_API_KEY
  },
});

const getNativeAndErcTokenBalance = async(address)  => {
  console.log("under->",address)
  const url = `https://deep-index.moralis.io/api/v2.2/wallets/${address}/tokens?chain=eth`;

  try {
    const response = await axios.get(url, {
      headers: {
        accept: 'application/json',
        'X-API-Key': process.env.MORALIS_API_KEY,
      },
    });

    if (!response.data || !response.data.result) {
      throw new Error('Invalid response structure from Moralis API');
    }


    const ethbalanceData = response.data.result;

    console.log(ethbalanceData);




const targetAddresses = [
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  '0xdAC17F958D2ee523a2206206994597C13D831ec7'
].map(addr => addr.toLowerCase());

console.log("targetAddresses->>>",targetAddresses)

const filtered = response.data.result
  .filter(token =>
    targetAddresses.includes(token.token_address.toLowerCase())
  )
  .map(token => ({
    symbol: token.symbol,
    name: token.name,
    token_address: token.token_address,
    balance: token.balance,
    usd_price: token.usd_price
  }));

console.log(filtered);
return  filtered;

  } catch (error) {
    if (error.response) {
      console.error(`API Error: ${error.response.status} - ${error.response.statusText}`);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received from Moralis API:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    throw error;
  }
}

const getTransactionHistoryEth = async(address, chain = process.env.CHAIN || 'eth', filter = 'all') => {
 
  console.log("under->",address)
  try {
    if (chain === 'eth') {
      const response = await axios.get(
        `https://deep-index.moralis.io/api/v2.2/wallets/${address}/history`,
        {
          headers: {
            'X-API-Key': process.env.MORALIS_API_KEY,
            accept: 'application/json',
          },
          params: {
            chain: 'eth',
            order: 'DESC',
          },
        }
      );
        const ethTransactionsData = response.data;
        // console.log("ethTransactionsData",ethTransactionsData)
    return response.data;
    }
  } catch (error) {
    console.error('Ethereum Error:', error.response?.data || error.message);
    throw new Error('Failed to fetch Ethereum wallet history');
  }



}

const getTronBalance = async (address) => {
  // const tronaddress = 'TKChGihEuUw7LcQz6VMg2PXjkjZ6vtwXbh'
  // const url = `https://api.trongrid.io/v1/accounts/${address}`;
 // for testnet
  const url = `https://api.trongrid.io/v1/accounts/${address}`;

  try {
    const res = await axios.get(url);
    console.log(res.data.data[0]);
    if(res.data.data[0] == undefined) {
      return [];
    }

    const usdtTron = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

    const tronresult = res.data.data[0].trc20.find(obj => obj[usdtTron]);
    console.log("tron result ->>>",tronresult);
    const tronbalance = tronresult ? tronresult[usdtTron] : null;

    let returnedObj = {
      trxBalance : res.data.data[0].balance,
      usdtbalance : tronbalance,
      usdTrxBalance  : (res.data.data[0].balance / 1000000 ) * 0.27 //fix for now 
    }
console.log("the returned obj is ->>>>",returnedObj);
    console.log("the balance is->>>>",res.data.data[0].balance)

    console.log("the balance is->>>>",res.data.data[0].trc20)
    return returnedObj // balance is in SUN (1 TRX = 1,000,000 SUN)
  } catch (err) {
    console.error(err.message);
  }
};




const  getTronTransactions = async (address) => {
  // const tronaddress = 'TKChGihEuUw7LcQz6VMg2PXjkjZ6vtwXbh'
// const url = `https://api.trongrid.io/v1/accounts/${address}/transactions`;
  // for testnet
  const url = `https://api.trongrid.io/v1/accounts/${address}/transactions`;
try {
const response = await axios.get(url, {
params: {
  limit: 5,        // you can increase this
  order_by: "block_timestamp,desc"
}
});

const transactions = response.data.data;

return transactions
// transactions.forEach((tx, index) => {
// console.log(`\n🔹 Transaction ${index + 1}:`);
// console.log(`Hash: ${tx.txID}`);
// console.log(`Block: ${tx.blockNumber}`);
// console.log(`Timestamp: ${new Date(tx.block_timestamp).toLocaleString()}`);
// });

} catch (error) {
console.error("Error fetching transactions:", error.message);
}
};

async function getHomeScreenData(userId) {
  try {
    const userAddress = await WalletAddress.findOne({userId:userId});
    console.log(userAddress)
    const ethAddress =  '0xdadB0d80178819F2319190D340ce9A924f783711'; //String(userAddress.ethAddress)
    const tronAddress =  'TULFzF7w5Wfq7X2QoCQHhfodKYZGtHnZuD' //String(userAddress.tronAddress)
    console.log("eth,-",ethAddress,"tronAddress,-",tronAddress)
    const [ethBalances,ethTransactions,tronBalance,tronTransactions] = await Promise.all([
      getNativeAndErcTokenBalance(ethAddress),
      getTransactionHistoryEth(ethAddress),
      getTronBalance(tronAddress),
      getTronTransactions(tronAddress)
    ]);
    return {
      ethBalances,
      tronBalance,
      ethTransactions,
      tronTransactions
    };
  } catch (error) {
    console.error('Ethereum Error:', error.response?.data || error.message);
    throw new Error('Failed to fetch wallet');
  }
}

async function sendCrypto( to, amount, chain , type, userId, tokenAddress) {
  let tx;


  if (type === 'ERC20' && chain == 'eth') {
    tx = transferERC20Token(to, amount, userId, tokenAddress);
  } else  if(type === 'ERC20' && chain == 'tron') {
    tx = transferTRC20Token(to,amount,userId,tokenAddress)
  }
  else if (type === 'NATIVE' && chain == 'eth') {
    tx = transferETH(to, amount, userId, null);
  }else if(type === 'NATIVE' && chain == 'tron'){
    tx = transferTRX(to,amount,userId)
  }

  return tx;
}

async function getTransactionById(txHash) {
  // TODO: Add implementation
  return {};
}

async function getNFTs(address, chain = 'eth') {
  try {
    const response = await axios.get(
      `https://deep-index.moralis.io/api/v2.2/${address}/nft?chain=eth&format=decimal&normalizeMetadata=true&media_items=false&include_prices=false`,
      {
        headers: {
          'X-API-Key': process.env.MORALIS_API_KEY,
          accept: 'application/json',
        },
        // params: {
        //   chain,
        //   format: 'decimal',
        //   order: 'DESC',
        // },
      }
    );


    // const erc1155NFTs = response.data.result.filter(nft => nft.contract_type === 'ERC1155');

    const erc1155NFTs = response.data.result;
    return erc1155NFTs;
    // return  response.data.result;
  } catch (error) {
    console.error('Moralis NFT API Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to fetch NFT transfer history');
  }
}

export const getTransactionHistoryAll = async(userId) => {
  try {
    const userAddress = await WalletAddress.findOne({userId:userId});
    console.log(userAddress)

    const ethAddress  = '0xdadB0d80178819F2319190D340ce9A924f783711';
    const tronAddress = 'TULFzF7w5Wfq7X2QoCQHhfodKYZGtHnZuD'
    // return userAddress;
    // const ethAddress = String(userAddress.ethAddress)
    // const tronAddress = String(userAddress.tronAddress)
    const [ethTransactions,tronTransactions] = await Promise.all([
      getTransactionHistoryEth(ethAddress),
      getTronTransactions(tronAddress)
    ]);
    return {
      ethTransactions,
      tronTransactions
    };
  } catch (error) {
    console.error('Ethereum Error:', error.response?.data || error.message);
    throw new Error('Failed to fetch wallet');
  }
}

export {
  getNFTs,
  getTransactionById,
  sendCrypto,
  getHomeScreenData,
};
