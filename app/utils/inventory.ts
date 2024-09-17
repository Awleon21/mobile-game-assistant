const axios = require('axios');
import { refreshToken } from './roster'

// Set up your API configuration
const MSF_API_URL = 'https://api.marvelstrikeforce.com/player/v1/inventory';

const MSF_API_KEY = process.env.MSF_API_KEY;  // API Key
const BEARER_TOKEN = process.env.MFS_BEARER_TOKEN;


export async function getInventory({
    page = 1,
    perPage = 10,
    itemFormat = 'id',
    statsFormat = 'object',
    pieceInfo = 'full',
    lang = 'en',
    itemType,
    retries = 3,
  }) {

    while (retries > 0) { 
      try {
        const response = await axios.get(MSF_API_URL, {
          headers: {
            'x-api-key': MSF_API_KEY,
            'Authorization': `Bearer ${BEARER_TOKEN}`,
          },
          params: {
            page,
            perPage,
            itemFormat,
            statsFormat,
            pieceInfo,
            lang,
            itemType, // Optional filter by item type
          },
        });
        
        console.log('Inventory data:', response.data);
        return response.data;

      } catch (error) {

        if (error.response && [401, 403].includes(error.response.status)) {
          await refreshToken();
          retries--;
          continue;
        }
        return { error: error.message };
      }
    }
    return { error: 'Max Retries Reached' };
  }