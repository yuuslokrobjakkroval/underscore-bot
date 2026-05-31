const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");
const User = require("../../database/models/user");
const emojis = require("../../utils/emojis");
const {
  findGrant,
  getBotId,
  hasNoPrefix,
  isActiveGrant,
  setUserGrant,
} = require("../../utils/entitlements");

const expiryFromDays = (days) =>
  days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
const formatExpiry = (date) =>
  date ? `<t:${Math.floor(new Date(date).getTime() / 1000)}:R>` : "Never";

module.exports = {
  name: "noprefix",
  aliases: ["np"],
  description: "Manage users with No-Prefix permissions for this bot",
  data: new SlashCommandBuilder()
    .setName("noprefix")
    .setDescription("Manage No-Prefix settings")
    .addSubcommand((sub) =>
      sub.setName("status").setDescription("Check your no-prefix status"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Add no-prefix to a user on this bot")
        .addUserOption((opt) =>
          opt
            .setName("user")
            .setDescription("The user to add")
            .setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("days")
            .setDescription("Duration in days (0 for lifetime)")
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove no-prefix from a user on this bot")
        .addUserOption((opt) =>
          opt
            .setName("user")
            .setDescription("The user to remove")
            .setRequired(true),
        ),
    ),

  async execute(client, message, args = []) {
    const isInteraction = !!message.options;
    const sub = isInteraction
      ? message.options.getSubcommand()
      : (args[0] || "status").toLowerCase();
    const user = isInteraction ? message.user : message.author;
    const botId = getBotId(client);

    const createMsg = (text, isError = false) => ({
      components: [
        new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `${isError ? `> ${emojis.error} ` : "> "}${text}`,
            ),
          )
          .toJSON(),
      ],
      flags: MessageFlags.IsComponentsV2,
    });

    if (!["status", "add", "remove"].includes(sub)) {
      return createMsg(
        `Invalid usage. Use \`${client.config.prefix}noprefix <status | add | remove> [@user] [days]\`.`,
        true,
      );
    }

    if (sub === "status") {
      const userData = await User.findOne({ userId: user.id });
      const grant = findGrant(userData?.botNoPrefixes, botId);
      const hasNP = await hasNoPrefix(client, user.id, userData);
      const expires = grant?.until ? `\n**Expires:** ${formatExpiry(grant.until)}` : "";

      return createMsg(
        `**${emojis.feather} No-Prefix Status**\n` +
          `**Bot:** <@${botId}>\n` +
          `**User:** ${user.username}\n` +
          `**Status:** ${hasNP ? "Enabled" : "Disabled"}${hasNP ? expires : ""}`,
      );
    }

    if (!client.config.owners.includes(user.id)) {
      return createMsg("This subcommand is restricted to Bot Owners.", true);
    }

    const targetUser = isInteraction
      ? message.options.getUser("user")
      : message.mentions.users.first();

    if (!targetUser) {
      return createMsg("Please mention a user.", true);
    }

    if (sub === "add") {
      const days = isInteraction
        ? message.options.getInteger("days") || 0
        : parseInt(args[2] || 0, 10);
      const targetData = await User.findOne({ userId: targetUser.id });
      const existingGrant = findGrant(targetData?.botNoPrefixes, botId);

      if (isActiveGrant(existingGrant)) {
        return createMsg(
          `**${targetUser.username}** already has No-Prefix on <@${botId}>. Expires: ${formatExpiry(existingGrant.until)}`,
          true,
        );
      }

      const expiryDate = expiryFromDays(days);
      await setUserGrant(targetUser.id, "botNoPrefixes", botId, true, expiryDate);

      const { noPrefixCache } = require("../../events/client/messageCreate");
      if (noPrefixCache) noPrefixCache.delete(`${targetUser.id}:${botId}`);

      return createMsg(
        `**No-Prefix Granted**\n` +
          `**User:** ${targetUser.username}\n` +
          `**Bot:** <@${botId}>\n` +
          `**Duration:** ${days > 0 ? `${days} days` : "Lifetime"}`,
      );
    }

    await setUserGrant(targetUser.id, "botNoPrefixes", botId, false, null);

    const { noPrefixCache } = require("../../events/client/messageCreate");
    if (noPrefixCache) noPrefixCache.delete(`${targetUser.id}:${botId}`);

    return createMsg(
      `Removed No-Prefix from **${targetUser.username}** on <@${botId}>.`,
    );
  },
};
