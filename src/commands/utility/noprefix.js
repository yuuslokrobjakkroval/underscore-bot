const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");
const User = require("../../database/models/user");
const emojis = require("../../utils/emojis");

module.exports = {
  name: "noprefix",
  aliases: ["np"],
  description: "Manage users with No-Prefix permissions (Owner only)",
  data: new SlashCommandBuilder()
    .setName("noprefix")
    .setDescription("Manage No-Prefix settings")
    .addSubcommand((sub) =>
      sub.setName("status").setDescription("Check your no-prefix status"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Add no-prefix to a user (Owner only)")
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
        .setDescription("Remove no-prefix from a user (Owner only)")
        .addUserOption((opt) =>
          opt
            .setName("user")
            .setDescription("The user to remove")
            .setRequired(true),
        ),
    ),
  async execute(client, message, args) {
    const isInteraction = !!message.options;
    const sub = isInteraction
      ? message.options.getSubcommand()
      : args[0] || "status";
    const user = isInteraction ? message.user : message.author;
    const owners = client.config.owners;

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

    const allowedSubs = ["status", "add", "remove"];
    if (!allowedSubs.includes(sub)) {
      const p = client.config.prefix;
      return createMsg(
        `**Invalid Usage!**\n> **Correct Usage:** \`${p}noprefix <status | add | remove> [@user] [days]\``,
        true,
      );
    }

    if (sub === "status") {
      let userData = await User.findOne({ userId: user.id });
      const hasNP = userData?.noPrefix || false;
      const expiry = userData?.noPrefixUntil
        ? ` (Expires: <t:${Math.floor(userData.noPrefixUntil.getTime() / 1000)}:R>)`
        : "";
      return createMsg(
        `**${emojis.feather} No-Prefix Status**\n` +
          `› **User:** ${user.username}\n` +
          `**Status:** ${hasNP ? "Enabled ✨" : "Disabled"}${hasNP ? `\n**Expires:** ${expiry || "Never"}` : ""}`,
      );
    }

    // Owner only commands
    if (!owners.includes(user.id)) {
      return createMsg("This subcommand is restricted to Bot Owners.", true);
    }

    const targetUser = isInteraction
      ? message.options.getUser("user")
      : message.mentions.users.first();
    if (!targetUser)
      return createMsg("Please mention a user or provide a user ID.", true);

    let targetData = await User.findOne({ userId: targetUser.id });
    if (!targetData) targetData = await User.create({ userId: targetUser.id });

    if (sub === "add") {
      const days = isInteraction
        ? message.options.getInteger("days") || 0
        : parseInt(args[2] || 0);
      const isNPActive =
        targetData.noPrefix &&
        (!targetData.noPrefixUntil || targetData.noPrefixUntil > Date.now());

      if (isNPActive && days > 0) {
        const expiry = targetData.noPrefixUntil
          ? `<t:${Math.floor(targetData.noPrefixUntil.getTime() / 1000)}:R>`
          : "Lifetime";
        return createMsg(
          `**${targetUser.username}** already has **No-Prefix**! (Expires: ${expiry})`,
          true,
        );
      }

      if (targetData.noPrefix && !targetData.noPrefixUntil && days === 0) {
        return createMsg(
          `**${targetUser.username}** already has **Lifetime** No-Prefix.`,
          true,
        );
      }

      const expiryDate =
        days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;

      targetData.noPrefix = true;
      targetData.noPrefixUntil = expiryDate;
      await targetData.save();

      const { noPrefixCache } = require("../../events/client/messageCreate");
      if (noPrefixCache) noPrefixCache.delete(targetUser.id);

      const expiryText = days > 0 ? `for **${days} days**` : "**Lifetime**";

      // DM Notification
      try {
        const dmContainer = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### ${emojis.feather} No-Prefix Granted!\n` +
              `Your No-Prefix has been activated ${expiryText}.\n\n` +
              `› **${emojis.search} How to use:**\n` +
              `Just type the command directly (e.g., \`play\`, \`skip\`).\n` +
              `No need to use the prefix \`${client.config.prefix}\` anymore!\n` +
              `Works in all servers where the bot is present.`,
          ),
        );
        await targetUser
          .send({
            components: [dmContainer.toJSON()],
            flags: MessageFlags.IsComponentsV2,
          })
          .catch(() => {});
        client.logger.info(
          `[No-Prefix] Sent Activation DM to user ${targetUser.id}`,
        );
      } catch (err) {}

      return createMsg(
        `*${emojis.feather} *No-Prefix Granted**\n` +
          `ㅤ\n` +
          `› **User:** ${targetUser.username}\n` +
          `**Status:** Activated\n` +
          `**Duration:** ${expiryText}`,
      );
    } else if (sub === "remove") {
      targetData.noPrefix = false;
      targetData.noPrefixUntil = null;
      await targetData.save();

      // Clear cache
      const { noPrefixCache } = require("../../events/client/messageCreate");
      if (noPrefixCache) noPrefixCache.delete(targetUser.id);

      // DM Notification
      try {
        const dmContainer = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### ${emojis.error} No-Prefix Revoked\n` +
              `› **Notification:**\n` +
              `Your No-Prefix has been removed.\n` +
              `You must now use the prefix \`${client.config.prefix}\` for all commands.`,
          ),
        );
        await targetUser
          .send({
            components: [dmContainer.toJSON()],
            flags: MessageFlags.IsComponentsV2,
          })
          .catch(() => {});
        client.logger.info(
          `[No-Prefix] Sent Revoke DM to user ${targetUser.id}`,
        );
      } catch (err) {}

      return createMsg(`Removed No-Prefix from **${targetUser.username}**.`);
    }
  },
};
