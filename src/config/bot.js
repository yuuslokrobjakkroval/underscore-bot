module.exports = {
  token: process.env.TOKEN,
  prefix: process.env.PREFIX || "!",
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  owners: process.env.OWNER_ID ? process.env.OWNER_ID.split(",") : ["966688007493140591"], // default to a single owner if not set
  colors: {
    background: "#111827",
    accent: "#a855f7",
    success: "#22c55e",
    error: "#ef4444",
  },
};
