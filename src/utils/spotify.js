const SpotifyWebApi = require('spotify-web-api-node');
const config = require('../config/spotify');
const logger = require('./logger');
const formatError = require('./formatError');

// Hardcoded fallbacks from source project (Viora/Avon)
const FALLBACK_ID = '83c98500a89a4a5eae6fa819643644b8';
const FALLBACK_SECRET = 'b2627d1bf6c846d98e102fe58e656892';

const spotifyApi = new SpotifyWebApi({
    clientId: config.clientId || FALLBACK_ID,
    clientSecret: config.clientSecret || FALLBACK_SECRET
});

let tokenExpiry = 0;
let usingFallback = false;

async function ensureToken() {
    if (Date.now() < tokenExpiry) return true;

    try {
        const data = await spotifyApi.clientCredentialsGrant();
        spotifyApi.setAccessToken(data.body['access_token']);
        tokenExpiry = Date.now() + (data.body['expires_in'] * 1000) - 60000;
        return true;
    } catch (error) {
        logger.error(`[SPOTIFY] Token Refresh Error: ${formatError(error)}`);
        
        // Try fallback
        if (!usingFallback && config.clientId !== FALLBACK_ID) {
            logger.warn('[SPOTIFY] Auth failed. Attempting Viora fallback for discovery...');
            spotifyApi.setClientId(FALLBACK_ID);
            spotifyApi.setClientSecret(FALLBACK_SECRET);
            usingFallback = true;
            return ensureToken();
        }
        return false;
    }
}

/**
 * Finds tracks with a similar "vibe" using Spotify Recommendations
 */
async function getRecommendedVibe(title, author) {
    await ensureToken();

    try {
        // 1. Find the track on Spotify to get its ID
        const searchRes = await spotifyApi.searchTracks(`track:${title} artist:${author}`, { limit: 1 });
        const track = searchRes.body.tracks?.items[0];
        
        if (!track) return null;

        // 2. Get recommendations based on this track ID
        const recRes = await spotifyApi.getRecommendations({
            seed_tracks: [track.id],
            limit: 5
        });

        return recRes.body.tracks.map(t => ({
            title: t.name,
            author: t.artists[0].name,
            uri: t.external_urls.spotify
        }));
    } catch (error) {
        logger.error(`[SPOTIFY] Rec Error: ${formatError(error)}`);
        return null;
    }
}

module.exports = { getRecommendedVibe };
