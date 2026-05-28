const envOwners = process.env.OWNER_ID
  ? process.env.OWNER_ID.split(",").map((id) => id.trim()).filter(Boolean)
  : ["966688007493140591"];

module.exports = {
  token: process.env.TOKEN,
  prefix: process.env.PREFIX || ".",
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  envOwners,
  owners: envOwners, // default/root owners from env
  colors: {
    background: process.env.BACKGROUND_COLOR || "#111827",
    accent: process.env.ACCENT_COLOR || "#a855f7",
    success: process.env.SUCCESS_COLOR || "#22c55e",
    error: process.env.ERROR_COLOR || "#ef4444",
  },
  channels: {
    log: process.env.LOG_CHANNEL_ID || "123456789012345678",
    error: process.env.ERROR_CHANNEL_ID || "123456789012345678",
  },
  link: {
    invite: `https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot%20applications.commands`,
    support: "https://discord.gg/pookie",
    website: "https://pookie.app",
  },
};
