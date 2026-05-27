const mongoose = require("mongoose");
const GuildSchema = new mongoose.Schema(
  {
    // ── Identity ─────────────────────────────────────────────────────────
    guildId: { type: String, required: true, unique: true },
    name: { type: String, default: null },
    iconURL: { type: String, default: null },
    ownerId: { type: String, default: null },
    memberCount: { type: Number, default: 0 },
    locale: { type: String, default: "en-US" },

    // ── Status ────────────────────────────────────────────────────────────
    active: { type: Boolean, default: true },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date, default: null },

    // ── Settings (per-guild configuration) ───────────────────────────────
    prefix: { type: String, default: null },
    djRole: { type: String, default: null },

    settings: {
      logChannel: { type: String, default: null }, // Channel for server log messages
      welcomeChannel: { type: String, default: null }, // Channel for welcome messages
      musicChannel: { type: String, default: null }, // Restrict music cmds to this channel
      language: { type: String, default: "en" },
      defaultVolume: { type: Number, default: 100, min: 0, max: 200 },
    },

    // ── Music Features ────────────────────────────────────────────────────
    autoplay: { type: Boolean, default: false },
    stay247: { type: Boolean, default: false },
    lastTrack: { type: Object, default: null },

    // ── Premium ───────────────────────────────────────────────────────────
    premium: { type: Boolean, default: false },
    premiumUntil: { type: Date, default: null },
    premiumBy: { type: String, default: null }, // User ID who granted premium

    // ── Statistics ────────────────────────────────────────────────────────
    totalSongsPlayed: { type: Number, default: 0 },
    topArtists: { type: Map, of: Number, default: {} },
    topSongs: [
      {
        title: String,
        uri: String,
        count: { type: Number, default: 0 },
      },
    ],
  },
  {
    timestamps: true, // auto-adds createdAt & updatedAt
  },
);
module.exports = mongoose.model("Guild", GuildSchema);
