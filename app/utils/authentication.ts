import express from 'express';
import axios from 'axios';
import querystring from 'querystring';

const app = express();

const CLIENT_ID = 'bb71fb09-90af-4f83-989a-d80a03656b63';
const CLIENT_SECRET = 'aga81WRWjsD8_.ctwdtt37dete';
const AUTH_URL = 'https://hydra-public.prod.m3.scopelypv.com/oauth2/auth';
const TOKEN_URL = 'https://hydra-public.prod.m3.scopelypv.com/oauth2/token';
const REDIRECT_URI = 'https://localhost:3000/callback';
const SCOPE = 'm3p.f.pr.pro m3p.f.pr.ros m3p.f.pr.inv m3p.f.pr.act m3p.f.ar.pro offline';
const STATE = 'randomstate123';

let accessToken = 'ii9g-yKiZv7azWIgmXufr5f1QccDRo3mvNKHbcNPpD8.Dqw9LH-dybucAZ-CO8TQIiUnjcfEKiOaYs-GSjuY868';
let refreshToken = '';

app.get('/auth', (req, res) => {
  const authParams = querystring.stringify({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPE,
    state: STATE,
  });
  const authUrl = `${AUTH_URL}?${authParams}`;
  res.redirect(authUrl);
});

// Handle the callback from OAuth server
app.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.send('No authorization code received');
  }

  // Exchange authorization code for access token and refresh token
  try {
    const tokenResponse = await axios.post(
      TOKEN_URL,
      querystring.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    accessToken = tokenResponse.data.access_token;
    refreshToken = tokenResponse.data.refresh_token;

    res.send('Authentication successful!');
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    res.send('Error during authentication');
  }
});

// Function to refresh access token
export async function refreshAccessToken() {
  try {
    const response = await axios.post(
      TOKEN_URL,
      querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token;
    console.log('Access token refreshed');
  } catch (error) {
    console.error('Error refreshing access token:', error);
  }
}

// Example API call function with token refresh
async function makeApiCall() {
  try {
    const response = await axios.get('https://api.marvelstrikeforce.com/player/v1/card', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log('API call response:', response.data);
  } catch (error) {
    if (error.response.status === 403) {
      // Token expired, refresh it
      console.log('Token expired, refreshing...');
      await refreshAccessToken();
      // Retry the API call with the new token
      return makeApiCall();
    }

    console.error('API call error:', error);
  }
}

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
