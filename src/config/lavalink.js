require("dotenv").config();

module.exports = [
  {
    name: process.env.LAVALINK_NAME || "pookie",
    url: `${process.env.LAVALINK_HOST}:${process.env.LAVALINK_PORT}`,
    auth: process.env.LAVALINK_PASSWORD,
    secure: process.env.LAVALINK_SECURE === "true",
  },
];
