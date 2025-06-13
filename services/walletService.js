import axios from 'axios';
import { request, gql,GraphQLClient } from 'graphql-request';
import { transferERC20Token, transferETH } from '../utils/transfer-crypto.js';
const endpoint = 'https://streaming.bitquery.io/eap';
import WalletAddress from './../models/WalletAddress.js'
const graphQLClient = new GraphQLClient(endpoint, {
  headers: {
    Authorization: `Bearer ${process.env.GRAPHQL_TOKEN}` // or use an API key
    // Example: 'X-API-Key': process.env.MY_API_KEY
  },
});

async function getNativeAndErcTokenBalance(address) {
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

    return response.data.result;
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

async function getTransactionHistory(address, chain = process.env.CHAIN || 'eth', filter = 'all') {
 
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

    return response.data;
    }
  } catch (error) {
    console.error('Ethereum Error:', error.response?.data || error.message);
    throw new Error('Failed to fetch Ethereum wallet history');
  }



}

async function getTronUsdtAndTrxBalance(address = 'TSqM8knaeobafYxdFYPfZ6SSvLv2DNuRSj') {
  // const query = gql`
  //   query GetUser($id: ID!) {
  //     user(id: $id) {
  //       id
  //       name
  //       email
  //     }
  //   }
  // `;

  // const variables = { id: address };

  // try {
  //   const data = await graphQLClient.request(query, variables);
  //   console.log('Response:', data);
  //   return data;
  // } catch (error) {
  //   console.error('GraphQL error:', error);
  // }
  return [];
}

async function getHomeScreenData(userId) {
  try {
    const userAddress = await WalletAddress.findOne({userId:userId});
    console.log(userAddress)
    // return userAddress;
    const address = String(userAddress.address)
    console.log("Addresss->",address);
    const [ethBalances, tronBalance,ethTransactions] = await Promise.all([
      getNativeAndErcTokenBalance(address),
      getTronUsdtAndTrxBalance(address),
      getTransactionHistory(address),
    ]);
    return {
      ethBalances,
      tronBalance,
      ethTransactions,
    };
  } catch (error) {
    console.error('Ethereum Error:', error.response?.data || error.message);
    throw new Error('Failed to fetch wallet');
  }
}

async function sendCrypto(privateKey, to, amount, chain = process.env.chain, type, userId, tokenAddress) {
  let tx;

  if (type === 'ERC20') {
    tx = transferERC20Token(to, amount, userId, tokenAddress);
  } else if (type === 'NATIVE') {
    tx = transferETH(to, amount, userId, null);
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
        params: {
          chain,
          format: 'decimal',
          order: 'DESC',
        },
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

export {
  getNFTs,
  getTransactionById,
  sendCrypto,
  getHomeScreenData,
  getTransactionHistory
};
