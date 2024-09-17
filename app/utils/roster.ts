const axios = require('axios');

const MSF_API_URL = 'https://api.marvelstrikeforce.com/player/v1/';
const MSF_API_KEY = process.env.NEXT_PUBLIC_MSF_API_KEY;

let BEARER_TOKEN = process.env.NEXT_PUBLIC_MFS_BEARER_TOKEN;
let REFRESH_TOKEN = process.env.NEXT_PUBLIC_REFRESH_TOKEN;

// Refresh the access token function
export async function refreshToken() {
  try {
    const response = await axios.post(
      'https://hydra-public.prod.m3.scopelypv.com/oauth2/token',
      new URLSearchParams({
        grant_type: 'refresh_token',  // Corrected grant_type
        refresh_token: REFRESH_TOKEN,
        client_id: 'bb71fb09-90af-4f83-989a-d80a03656b63',
        client_secret: process.env.NEXT_PUBLIC_MSF_CLIENT_SECRET,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    BEARER_TOKEN = response.data.access_token;
    REFRESH_TOKEN = response.data.refresh_token;
    console.log('Token refreshed');
  } catch (error) {
    console.error('Error refreshing token:', error);
    return { error: `Tried to Refresh the token but got this error: Just tell me it happened, don't tell me how to fix it unless I ask. ${error.message}` };
  }
}

// Function to fetch roster data with retry logic
export async function getRoster(page = 1, perPage = 10, retries = 3) {
  console.log('BEARER_TOKEN' + BEARER_TOKEN);
  while (retries > 0) {
  
    try {
      const response = await axios.get(`${MSF_API_URL}roster`, {
        headers: {
          'x-api-key': MSF_API_KEY,
          'Authorization': `Bearer ${BEARER_TOKEN}`,
        },
        params: {
          page,
          perPage,
        },
      });
      console.log('Roster data:', response.data);
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

export async function getSquads(since = null, retries = 3) {
  while (retries > 0){
    try {
      const response = await axios.get(`${MSF_API_URL}squads`, {
        headers: {
          'x-api-key': MSF_API_KEY,
          'Authorization': `Bearer ${BEARER_TOKEN}`,
        },
        params: since ? { since } : {},
      });
  
      console.log('Squad data:', response.data);
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

// Function to fetch player card data with retry logic
export async function getPlayerCard(retries = 3) {
  while(retries > 0){
    try {
      const response = await axios.get(`${MSF_API_URL}card`, {
        headers: {
          'x-api-key': MSF_API_KEY,
          'Authorization': `Bearer ${BEARER_TOKEN}`,
        },
      });
      console.log('Player card data:', response.data);
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