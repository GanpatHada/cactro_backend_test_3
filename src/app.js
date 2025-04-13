const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const axios = require("axios");
require("dotenv").config();
const errorHandler = require("./middlewares/errorHandler.middleware");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true, limit: "50kb" }));

const PORT = process.env.PORT || 8000;

// Spotify credentials from environment variables
let accessToken = process.env.SPOTIFY_ACCESS_TOKEN;
const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

// Refresh token function
async function refreshAccessToken() {
  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", refreshToken);

  const authBuffer = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
    const response = await axios.post("https://accounts.spotify.com/api/token", params, {
      headers: {
        Authorization: `Basic ${authBuffer}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    accessToken = response.data.access_token;
    console.log("🔄 Access token refreshed!");
  } catch (error) {
    console.error("Error refreshing access token:", error.response?.data);
  }
}

// Middleware to ensure we always have a valid access token
async function ensureValidAccessToken(req, res, next) {
  try {
    // Check if the current access token is valid
    await axios.get("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    next();
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log("⚠️ Access token expired, refreshing...");
      await refreshAccessToken();
      next();
    } else {
      res.status(500).json({ error: "Failed to validate access token" });
    }
  }
}

// Route: Home
app.get("/", (_, res) => {
  res.status(200).json({ message: "Hello app" });
});

// Route: Get top 10 tracks
app.get("/spotify/top-tracks", ensureValidAccessToken, async (req, res) => {
  try {
    const response = await axios.get("https://api.spotify.com/v1/me/top/tracks?limit=10", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const topTracks = response.data.items.map((track) => ({
      name: track.name,
      artist: track.artists.map((artist) => artist.name).join(", "),
      uri: track.uri,
    }));

    res.json(topTracks);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).send("Error fetching top tracks");
  }
});

// Route: Get currently playing song
app.get("/spotify/currently-playing", ensureValidAccessToken, async (req, res) => {
  try {
    const response = await axios.get("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const currentlyPlaying = response.data?.item
      ? {
          name: response.data.item.name,
          artist: response.data.item.artists.map((a) => a.name).join(", "),
          uri: response.data.item.uri,
        }
      : null;

    res.json(currentlyPlaying);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).send("Error fetching currently playing song");
  }
});

// Route: Pause the song
app.get("/spotify/pause", ensureValidAccessToken, async (req, res) => {
  try {
    await axios.put(
      "https://api.spotify.com/v1/me/player/pause",
      {},
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    res.send("Playback paused successfully!");
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).send("Error pausing playback");
  }
});

// Route: Play a song
app.get("/spotify/play", ensureValidAccessToken, async (req, res) => {
  const trackUri = req.query.uri;

  if (!trackUri) {
    return res.status(400).send("Missing track URI");
  }

  try {
    await axios.put(
      "https://api.spotify.com/v1/me/player/play",
      { uris: [trackUri] },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    res.send(`Playback started for ${trackUri}`);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).send("Error starting playback");
  }
});

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`App is running on port: ${PORT}`);
});
