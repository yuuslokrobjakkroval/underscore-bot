const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    likedSongs: [{
        title: String,
        author: String,
        uri: String,
        identifier: String,
        thumbnail: String,
        length: Number
    }],
    history: [{
        title: String,
        author: String,
        uri: String,
        playedAt: { type: Date, default: Date.now }
    }],
    noPrefix: { type: Boolean, default: false },
    noPrefixUntil: { type: Date, default: null },
    premium: { type: Boolean, default: false },
    premiumUntil: { type: Date, default: null },
    botNoPrefixes: [{
        botId: { type: String, required: true },
        enabled: { type: Boolean, default: true },
        until: { type: Date, default: null }
    }],
    botPremiums: [{
        botId: { type: String, required: true },
        enabled: { type: Boolean, default: true },
        until: { type: Date, default: null }
    }],
    topArtists: { type: Map, of: Number, default: {} }, // Artist Name -> Play Count
    topSongs: [{ title: String, uri: String, count: { type: Number, default: 0 } }],
    spotify: {
        accessToken: String,
        refreshToken: String,
        expiresAt: Date,
        spotifyId: String,
        displayName: String,
        product: String
    }
});

module.exports = mongoose.model('User', UserSchema);
