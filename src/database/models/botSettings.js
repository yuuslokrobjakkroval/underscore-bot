const mongoose = require("mongoose");

const BotSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    botId: { type: String, default: null, index: true },
    botTag: { type: String, default: null },
    mode: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
    owners: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("BotSettings", BotSettingsSchema);
