const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  SectionBuilder,
  ThumbnailBuilder,
} = require("discord.js");
const Guild = require("../../database/models/guild");
const User = require("../../database/models/user");
const emojis = require("../../utils/emojis");
const {
  findGrant,
  getBotId,
  hasGuildPremium,
  hasUserPremium,
  isActiveGrant,
  setGuildPremium,
  setUserGrant,
} = require("../../utils/entitlements");

const cleanId = (value) => value?.replace(/[<@!>]/g, "");
const expiryFromDays = (days) =>
  days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
const formatExpiry = (date) =>
  date ? `<t:${Math.floor(new Date(date).getTime() / 1000)}:R>` : "Never";

module.exports = {
  name: "premium",
  description: "Manage premium status (Owner only)",
  data: new SlashCommandBuilder()
    .setName("premium")
    .setDescription("Manage Premium settings")
    .addSubcommand((sub) =>
      sub.setName("status").setDescription("Check your premium status"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("activate")
        .setDescription("Activate premium for a guild on this bot")
        .addStringOption((opt) =>
          opt
            .setName("guildid")
            .setDescription("The ID of the guild to activate")
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
        .setName("add")
        .setDescription("Add premium to a user on this bot")
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
        .setName("revoke")
        .setDescription("Revoke premium from a user or guild on this bot")
        .addStringOption((opt) =>
          opt
            .setName("type")
            .setDescription("Type: user or guild")
            .setRequired(true)
            .addChoices(
              { name: "User", value: "user" },
              { name: "Guild", value: "guild" },
            ),
        )
        .addStringOption((opt) =>
          opt
            .setName("id")
            .setDescription("User ID or Guild ID")
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

    const createMsg = (title, content, isError = false) => {
      const container = new ContainerBuilder().addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              isError ? `### ${emojis.error} ${title}` : `### ${title}`,
            ),
            new TextDisplayBuilder().setContent(`\n${content}`),
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(client.user.displayAvatarURL()),
          ),
      );
      return {
        components: [container.toJSON()],
        flags: MessageFlags.IsComponentsV2,
      };
    };

    if (sub === "status") {
      const userData = await User.findOne({ userId: user.id });
      const guildData = await Guild.findOne({ guildId: message.guild.id });
      const userGrant = findGrant(userData?.botPremiums, botId);
      const guildGrant = findGrant(guildData?.botPremiums, botId);
      const userPrem = await hasUserPremium(client, user.id, userData);
      const guildPrem = await hasGuildPremium(client, message.guild.id, guildData);
      const owner = client.config.owners.includes(user.id);

      let statusText = `**Bot:** <@${botId}>\n`;
      statusText += `**User Premium:** ${userPrem ? "Enabled" : "Disabled"}\n`;
      if (owner) statusText += "`Lifetime Owner Perk`\n";
      else if (userGrant?.until) statusText += `Expires ${formatExpiry(userGrant.until)}\n`;
      statusText += `\n**Guild Premium:** ${guildPrem ? "Enabled" : "Disabled"}\n`;
      if (guildGrant?.until) statusText += `Expires ${formatExpiry(guildGrant.until)}\n`;
      statusText += "\nPremium grants are scoped to this bot only.";

      return createMsg("Premium Status", statusText);
    }

    if (!client.config.owners.includes(user.id)) {
      return createMsg(
        "Access Denied",
        "This subcommand is restricted to Bot Owners.",
        true,
      );
    }

    if (sub === "revoke") {
      const type = isInteraction ? message.options.getString("type") : args[1];
      const targetId = cleanId(isInteraction ? message.options.getString("id") : args[2]);

      if (!["user", "guild"].includes(type) || !targetId) {
        return createMsg(
          "Invalid Usage",
          "Use `premium revoke <user|guild> <id>`.",
          true,
        );
      }

      if (type === "user") {
        await setUserGrant(targetId, "botPremiums", botId, false, null);
        await client.db.refresh(null, targetId);
        const { noPrefixCache } = require("../../events/client/messageCreate");
        if (noPrefixCache) noPrefixCache.delete(`${targetId}:${botId}`);
        return createMsg(
          "Premium Revoked",
          `Revoked premium from user \`${targetId}\` for <@${botId}>.`,
        );
      }

      await setGuildPremium(targetId, botId, false, null, user.id);
      await client.db.refresh(targetId, null);
      return createMsg(
        "Premium Revoked",
        `Revoked premium from guild \`${targetId}\` for <@${botId}>.`,
      );
    }

    if (sub === "activate") {
      const targetGuildId = isInteraction
        ? message.options.getString("guildid")
        : args[1];
      const days = isInteraction
        ? message.options.getInteger("days") || 0
        : parseInt(args[2] || 0, 10);

      if (!targetGuildId) {
        return createMsg("Invalid Usage", "Please provide a Guild ID.", true);
      }

      const existingGuild = await Guild.findOne({ guildId: targetGuildId });
      const existingGrant = findGrant(existingGuild?.botPremiums, botId);

      if (isActiveGrant(existingGrant)) {
        return createMsg(
          "Already Active",
          `Guild \`${targetGuildId}\` already has premium on <@${botId}>. Expires: ${formatExpiry(existingGrant.until)}`,
          true,
        );
      }

      const expiryDate = expiryFromDays(days);
      await setGuildPremium(targetGuildId, botId, true, expiryDate, user.id);
      await client.db.refresh(targetGuildId, null);

      return createMsg(
        "Guild Premium Activated",
        `**Guild:** \`${targetGuildId}\`\n**Bot:** <@${botId}>\n**Duration:** ${days > 0 ? `${days} days` : "Lifetime"}\n**Expires:** ${formatExpiry(expiryDate)}`,
      );
    }

    if (sub === "add") {
      const targetUser = isInteraction
        ? message.options.getUser("user")
        : message.mentions.users.first();
      const days = isInteraction
        ? message.options.getInteger("days") || 0
        : parseInt(args[2] || 0, 10);

      if (!targetUser) {
        return createMsg("Invalid Usage", "Please mention a user.", true);
      }

      const existingUser = await User.findOne({ userId: targetUser.id });
      const existingGrant = findGrant(existingUser?.botPremiums, botId);

      if (isActiveGrant(existingGrant)) {
        return createMsg(
          "Already Active",
          `**${targetUser.username}** already has premium on <@${botId}>. Expires: ${formatExpiry(existingGrant.until)}`,
          true,
        );
      }

      const expiryDate = expiryFromDays(days);
      await setUserGrant(targetUser.id, "botPremiums", botId, true, expiryDate);
      await client.db.refresh(null, targetUser.id);

      const { noPrefixCache } = require("../../events/client/messageCreate");
      if (noPrefixCache) noPrefixCache.delete(`${targetUser.id}:${botId}`);

      return createMsg(
        "User Premium Activated",
        `**User:** ${targetUser.username}\n**Bot:** <@${botId}>\n**Duration:** ${days > 0 ? `${days} days` : "Lifetime"}\n**Expires:** ${formatExpiry(expiryDate)}`,
      );
    }

    return createMsg(
      "Invalid Usage",
      "Use `premium status`, `premium add`, `premium activate`, or `premium revoke`.",
      true,
    );
  },
};
