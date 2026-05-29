const SpotifyWebApi = require("spotify-web-api-node");
const spotifyConfig = require("../config/spotify");
const metadata = require("./metadata");
const logger = require("./logger");
const formatError = require("./formatError");

// Hardcoded fallbacks from source project (Viora/Avon)
const FALLBACK_ID = "83c98500a89a4a5eae6fa819643644b8";
const FALLBACK_SECRET = "b2627d1bf6c846d98e102fe58e656892";

const spotifyApi = new SpotifyWebApi({
  clientId: spotifyConfig.clientId || FALLBACK_ID,
  clientSecret: spotifyConfig.clientSecret || FALLBACK_SECRET,
});

let tokenExpiry = 0;
let usingFallback = false;
let rateLimitedUntil = 0; // Epoch timestamp in ms when the rate limit expires

async function getAccessToken() {
  if (Date.now() < rateLimitedUntil) return false;
  if (Date.now() < tokenExpiry) return true;

  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body["access_token"]);
    tokenExpiry = Date.now() + data.body["expires_in"] * 1000 - 60000;
    return true;
  } catch (e) {
    if (e.statusCode === 429) {
      const retryAfter = parseInt(e.headers?.["retry-after"], 10) || 60;
      rateLimitedUntil = Date.now() + retryAfter * 1000;
      logger.warn(
        `[Spotify] Rate Limit hit (429). Pausing Spotify calls for next ${Math.round(retryAfter / 60)} minutes.`,
      );
      return false;
    }

    logger.error(`Spotify Auth Error: ${formatError(e)}`);

    // Try fallback if not already using it
    if (!usingFallback && spotifyConfig.clientId !== FALLBACK_ID) {
      logger.warn(
        "Spotify Auth failed with provided credentials. Attempting Viora fallback...",
      );
      spotifyApi.setClientId(FALLBACK_ID);
      spotifyApi.setClientSecret(FALLBACK_SECRET);
      usingFallback = true;
      return getAccessToken();
    }
    return false;
  }
}

/**
 * Performs an "Elite Metadata Wash" by looking up a YouTube track on Spotify
 * to get the most accurate (correct and exact) title and artist.
 */
async function washTrack(track) {
  if (!track) return null;

  // If it's already a Spotify track, just clean the metadata regex-wise
  if (track.sourceName === "spotify") {
    track.title = metadata.cleanTitle(track.title);
    track.author = metadata.cleanAuthor(track.author);
    return track;
  }

  // Skip Spotify API completely if currently in a rate limit cooldown window
  if (Date.now() < rateLimitedUntil) {
    track.title = metadata.cleanTitle(track.title);
    track.author = metadata.cleanAuthor(track.author);
    return track;
  }

  try {
    const hasAccess = await getAccessToken();
    if (!hasAccess) {
      // Immediately clean using regex fallback if access was denied/rate limited
      track.title = metadata.cleanTitle(track.title);
      track.author = metadata.cleanAuthor(track.author);
      return track;
    }

    // Use a cleaned query for better search accuracy on Spotify
    const cleanQuery =
      metadata.cleanTitle(track.title) +
      " " +
      metadata.cleanAuthor(track.author);
    const response = await spotifyApi.searchTracks(cleanQuery, { limit: 1 });

    if (response.body.tracks.items.length > 0) {
      const spTrack = response.body.tracks.items[0];
      track.title = spTrack.name;
      track.author = spTrack.artists.map((a) => a.name).join(", ");
      if (spTrack.album.images.length > 0) {
        track.thumbnail = spTrack.album.images[0].url;
      }
    } else {
      // Fallback to regex cleaning if no Spotify match found
      track.title = metadata.cleanTitle(track.title);
      track.author = metadata.cleanAuthor(track.author);
    }
  } catch (e) {
    if (e.statusCode === 429) {
      const retryAfter = parseInt(e.headers?.["retry-after"], 10) || 60;
      rateLimitedUntil = Date.now() + retryAfter * 1000;
      logger.warn(
        `[Spotify] Rate Limit hit (429). Pausing Spotify calls for next ${Math.round(retryAfter / 60)} minutes.`,
      );
    } else {
      logger.error(`Metadata Wash Error: ${formatError(e)}`);
    }

    // Fallback to regex cleaning
    track.title = metadata.cleanTitle(track.title);
    track.author = metadata.cleanAuthor(track.author);
  }

  return track;
}

module.exports = {
  washTrack,
};
