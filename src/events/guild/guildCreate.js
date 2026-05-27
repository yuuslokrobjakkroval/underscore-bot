const Guild = require("../../database/models/guild");
const logger = require("../../utils/logger");
const emojis = require("../../utils/emojis");
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
} = require("discord.js");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the welcome embed sent to the new guild's channel.
 * Uses Discord Components V2 to match the rest of Feather's UI.
 */
function buildWelcomeEmbed(client, guild) {
  const joinDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const container = new ContainerBuilder()
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ${emojis.feather} Thanks for adding Feather!`,
          ),
          new TextDisplayBuilder().setContent(
            `Welcome to **${guild.name}**! I'm ready to deliver high-quality music to your server.\n\n` +
              `> ${emojis.music} \`/play\` — Start playing music\n` +
              `> ${emojis.navigation} \`/help\` — Explore all commands\n` +
              `> ${emojis.admin} \`/dj\` — Set a DJ role *(Admins only)*`,
          ),
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(
            client.user.displayAvatarURL({ size: 256 }),
          ),
        ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `> ${emojis.check} Joined on **${joinDate}** · **${guild.memberCount.toLocaleString()}** members`,
      ),
    );

  return {
    components: [container.toJSON()],
    flags: MessageFlags.IsComponentsV2,
  };
}

/**
 * Build the log embed sent to the bot's global log channel.
 */
function buildGlobalLogEmbed(client, guild, type) {
  const isJoin = type === "join";
  const icon = isJoin ? emojis.check : emojis.error;
  const label = isJoin ? "Guild Added" : "Guild Removed";

  const container = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## ${icon} ${label}\n` +
        `> **Name:** ${guild.name ?? "Unknown"}\n` +
        `> **ID:** \`${guild.id}\`\n` +
        `> **Owner:** ${guild.ownerId ? `<@${guild.ownerId}> (\`${guild.ownerId}\`)` : "Unknown"}\n` +
        `> **Members:** ${guild.memberCount?.toLocaleString() ?? "Unknown"}\n` +
        `> **Total Servers:** ${client.guilds.cache.size.toLocaleString()}`,
    ),
  );

  return {
    components: [container.toJSON()],
    flags: MessageFlags.IsComponentsV2,
  };
}

/**
 * Find the best channel to send a message in the guild.
 * Priority: configured log channel → system channel → first available text channel
 */
async function findGuildChannel(guild, logChannelId = null) {
  const me = guild.members.me;
  if (!me) return null;

  const canSend = (ch) =>
    ch?.isTextBased?.() &&
    !ch.isThread?.() &&
    ch.permissionsFor(me)?.has("SendMessages");

  // 1. Configured log channel
  if (logChannelId) {
    const configured = guild.channels.cache.get(logChannelId);
    if (canSend(configured)) return configured;
  }

  // 2. System channel (set by guild admins)
  if (canSend(guild.systemChannel)) return guild.systemChannel;

  // 3. First readable text channel (by position)
  return (
    guild.channels.cache
      .filter(canSend)
      .sort((a, b) => a.position - b.position)
      .first() ?? null
  );
}

/**
 * Post a log embed to the bot's own global log channel.
 */
async function sendToGlobalLog(client, guild, type) {
  const logChannelId = client.config.channels?.log;
  if (!logChannelId || logChannelId === "123456789012345678") return;

  const logChannel = client.channels.cache.get(logChannelId);
  if (!logChannel) return;

  await logChannel
    .send(buildGlobalLogEmbed(client, guild, type))
    .catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// Event
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  name: "guildCreate",

  async execute(client, guild) {
    // Discord fires guildCreate for every guild during startup (before "ready").
    // We only want the welcome flow for genuine new joins.
    // guild.joinedTimestamp is the ms timestamp of when the bot joined;
    // if it's within 30 s of now it's a fresh invite — otherwise just update metadata.
    const isNewJoin = Date.now() - guild.joinedTimestamp < 30_000;

    logger.info(
      `[GUILD] ${isNewJoin ? "Joined" : "Available"}: ${guild.name} (${guild.id}) | Members: ${guild.memberCount}`,
    );

    try {
      // ── 1. Upsert guild record in MongoDB ──────────────────────────
      const existingGuild = await Guild.findOne({ guildId: guild.id });

      const update = {
        name: guild.name,
        iconURL: guild.iconURL() ?? null,
        ownerId: guild.ownerId,
        memberCount: guild.memberCount,
        locale: guild.preferredLocale ?? "en-US",
        active: true,
        leftAt: null,
      };

      // Only overwrite joinedAt when it's a real new join
      if (isNewJoin || !existingGuild) update.joinedAt = new Date();

      await Guild.findOneAndUpdate(
        { guildId: guild.id },
        { $set: update },
        { upsert: true, new: true },
      );

      // ── 2. Refresh in-memory cache ─────────────────────────────────
      await client.db.refresh(guild.id, null);

      // ── 3. Send welcome embed only for actual new joins ────────────
      if (isNewJoin) {
        const configuredLogId = existingGuild?.settings?.logChannel ?? null;
        const targetChannel = await findGuildChannel(guild, configuredLogId);

        if (targetChannel) {
          await targetChannel
            .send(buildWelcomeEmbed(client, guild))
            .catch(() => {});
        }

        // Also notify the bot's global log channel
        await sendToGlobalLog(client, guild, "join");
      }
    } catch (err) {
      logger.error(`[GUILD CREATE] Error for ${guild.id}: ${err.message}`);
    }
  },
};
