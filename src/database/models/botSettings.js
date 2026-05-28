const mongoose = require("mongoose");

const BotSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "global", unique: true },
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
