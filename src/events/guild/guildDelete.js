const Guild = require("../../database/models/guild");
const logger = require("../../utils/logger");
const emojis = require("../../utils/emojis");
const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the removal log embed for the bot's global log channel.
 */
function buildGlobalLogEmbed(client, guild) {
  const leftAt = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const container = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## ${emojis.error} Guild Removed\n` +
        `> **Name:** ${guild.name ?? "Unknown"}\n` +
        `> **ID:** \`${guild.id}\`\n` +
        `> **Members:** ${guild.memberCount?.toLocaleString() ?? "Unknown"}\n` +
        `> **Left on:** ${leftAt}\n` +
        `> **Total Servers:** ${client.guilds.cache.size.toLocaleString()}`,
    ),
  );

  return {
    components: [container.toJSON()],
    flags: MessageFlags.IsComponentsV2,
  };
}

/**
 * Post the removal embed to the bot's own global log channel.
 */
async function sendToGlobalLog(client, guild) {
  const logChannelId = client.config.channels?.log;
  if (!logChannelId || logChannelId === "123456789012345678") return;

  const logChannel = client.channels.cache.get(logChannelId);
  if (!logChannel) return;

  await logChannel.send(buildGlobalLogEmbed(client, guild)).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// Event
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  name: "guildDelete",

  async execute(client, guild) {
    // guild.available is false when Discord marks the guild as unavailable
    // (server outage). We only want the leave flow for an actual removal.
    if (!guild.available) return;

    logger.warn(
      `[GUILD] Left / Removed from: ${guild.name ?? "Unknown"} (${guild.id})`,
    );

    try {
      // ── 1. Mark the guild as inactive in MongoDB ───────────────────
      //    We intentionally keep all data (topArtists, songs, settings)
      //    so it can be restored if the bot is re-invited later.
      await Guild.findOneAndUpdate(
        { guildId: guild.id },
        { $set: { active: false, leftAt: new Date() } },
      );

      // ── 2. Evict from in-memory cache ──────────────────────────────
      client.db.guildCache.delete(guild.id);

      // ── 3. Notify the bot's global log channel ─────────────────────
      await sendToGlobalLog(client, guild);
    } catch (err) {
      logger.error(`[GUILD DELETE] Error for ${guild.id}: ${err.message}`);
    }
  },
};
