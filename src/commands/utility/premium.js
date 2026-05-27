const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  SectionBuilder,
  ThumbnailBuilder,
} = require("discord.js");
const User = require("../../database/models/user");
const Guild = require("../../database/models/guild");
const emojis = require("../../utils/emojis");

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
        .setDescription("Activate premium for a guild (Owner only)")
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
        .setDescription("Add premium to a user (Owner only)")
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
        .setDescription("Revoke premium from a user or guild (Owner only)")
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
  async execute(client, message, args) {
    const isInteraction = !!message.options;
    const sub = isInteraction
      ? message.options.getSubcommand()
      : args[0] || "status";
    const user = isInteraction ? message.user : message.author;
    const owners = client.config.owners;

    const createMsg = (title, content, isError = false) => {
      const container = new ContainerBuilder().addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              isError ? `### ${emojis.error} ${title}` : `### ${title}`,
            ),
            new TextDisplayBuilder().setContent(`ㅤ\n${content}`),
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
      const isOwner = client.config.owners.includes(user.id);

      const userPrem =
        (userData?.premium &&
          (!userData.premiumUntil || userData.premiumUntil > Date.now())) ||
        isOwner;
      const guildPrem =
        guildData?.premium &&
        (!guildData.premiumUntil || guildData.premiumUntil > Date.now());

      let statusText = `**${emojis.feather} Feather Premium Status**\n\n`;
      statusText += `› **User Premium:** ${userPrem ? "Enabled ✨" : "Disabled"}\n`;
      if (isOwner) statusText += `\`Lifetime Owner Perk\`\n`;
      else if (userData?.premiumUntil)
        statusText += `Expires <t:${Math.floor(userData.premiumUntil.getTime() / 1000)}:R>\n`;

      statusText += `\n› **Guild Premium:** ${guildPrem ? "Enabled ✨" : "Disabled"}\n`;
      if (guildData?.premiumUntil)
        statusText += `Expires <t:${Math.floor(guildData.premiumUntil.getTime() / 1000)}:R>\n`;

      statusText += `\n*Pro filters, 24/7 mode, and No-Prefix active.*`;

      return createMsg("Premium Status", statusText);
    }

    // Owner only commands
    if (!owners.includes(user.id)) {
      return createMsg(
        "Access Denied",
        "This subcommand is restricted to Bot Owners.",
        true,
      );
    }

    if (sub === "revoke") {
      const type = isInteraction ? message.options.getString("type") : args[1];
      const rawId = isInteraction ? message.options.getString("id") : args[2];
      const targetId = rawId?.replace(/[<@!>]/g, "");

      if (!type || !["user", "guild"].includes(type))
        return createMsg(
          "Invalid Usage",
          "Please specify type: `user` or `guild`.",
          true,
        );
      if (!targetId)
        return createMsg(
          "Invalid Usage",
          "Please provide a User/Guild ID.",
          true,
        );

      if (type === "user") {
        await User.findOneAndUpdate(
          { userId: targetId },
          { premium: false, premiumUntil: null },
        );

        // DM Notification
        try {
          const targetUser = await client.users.fetch(targetId);
          const dmContainer = new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `### ${emojis.error} Premium Revoked\n` +
                `Your **Feather Premium** subscription has been revoked by an administrator.\n\n` +
                `**Impact:**\n` +
                `No-Prefix access removed.\n` +
                `Premium filters disabled.\n` +
                `Regular usage limits reapplied.\n\n` +
                `*If you believe this is a mistake, please contact support.*`,
            ),
          );
          await targetUser
            .send({
              components: [dmContainer.toJSON()],
              flags: MessageFlags.IsComponentsV2,
            })
            .catch(() => {});
          client.logger.info(`[Premium] Sent Revoke DM to user ${targetId}`);
        } catch (err) {
          client.logger.error(
            `[Premium] Failed to send Revoke DM to ${targetId}: ${err.message}`,
          );
        }

        // Clear cache
        const { noPrefixCache } = require("../../events/client/messageCreate");
        if (noPrefixCache) noPrefixCache.delete(targetId);

        return createMsg(
          "Premium Revoked",
          `Revoked Premium from User \`${targetId}\`.`,
        );
      } else {
        await Guild.findOneAndUpdate(
          { guildId: targetId },
          { premium: false, premiumUntil: null },
        );

        // DM Notification for Owner
        try {
          const targetGuild =
            client.guilds.cache.get(targetId) ||
            (await client.guilds.fetch(targetId).catch(() => null));
          if (targetGuild) {
            const owner = await targetGuild.fetchOwner();
            const dmContainer = new ContainerBuilder().addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `### ${emojis.error} Guild Premium Revoked\n` +
                  `Premium status has been revoked from your server **${targetGuild.name}**.\n\n` +
                  `**Impact:**\n` +
                  `24/7 mode disabled.\n` +
                  `Queue limits reapplied.\n` +
                  `Special filters removed.\n\n` +
                  `*If you believe this is a mistake, please contact support.*`,
              ),
            );
            await owner
              .send({
                components: [dmContainer.toJSON()],
                flags: MessageFlags.IsComponentsV2,
              })
              .catch(() => {});
            client.logger.info(
              `[Premium] Sent Revoke DM to owner of guild ${targetId}`,
            );
          }
        } catch (err) {}

        return createMsg(
          "Premium Revoked",
          `Revoked Premium from Guild \`${targetId}\`.`,
        );
      }
    }

    if (sub === "activate") {
      const targetGuildId = isInteraction
        ? message.options.getString("guildid")
        : args[1];
      const days = isInteraction
        ? message.options.getInteger("days") || 0
        : parseInt(args[2] || 0);

      if (!targetGuildId)
        return createMsg("Invalid Usage", "Please provide a Guild ID.", true);

      const targetGuild = client.guilds.cache.get(targetGuildId);
      const guildName = targetGuild
        ? targetGuild.name
        : `Guild \`${targetGuildId}\``;

      const existingGuild = await Guild.findOne({ guildId: targetGuildId });
      const isGuildActive =
        existingGuild?.premium &&
        (!existingGuild.premiumUntil ||
          existingGuild.premiumUntil > Date.now());

      if (isGuildActive && days > 0) {
        const expiry = existingGuild.premiumUntil
          ? `<t:${Math.floor(existingGuild.premiumUntil.getTime() / 1000)}:R>`
          : "Lifetime";
        return createMsg(
          "Already Active",
          `Server **${guildName}** already has **Feather Premium**! (Expires: ${expiry})`,
          true,
        );
      }

      if (existingGuild?.premium && !existingGuild.premiumUntil && days === 0) {
        return createMsg(
          `Server **${guildName}** already has **Lifetime** Premium.`,
          true,
        );
      }

      const expiryDate =
        days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
      await Guild.findOneAndUpdate(
        { guildId: targetGuildId },
        { premium: true, premiumUntil: expiryDate },
        { upsert: true },
      );

      const durationText = days > 0 ? `**${days} days**` : "**Lifetime**";
      const expiryText =
        days > 0 ? `<t:${Math.floor(expiryDate.getTime() / 1000)}:R>` : "Never";

      // Notification logic
      if (targetGuild) {
        const dmContent =
          `### ${emojis.feather} Feather Guild Premium Activated!\n` +
          `Your server **${targetGuild.name}** have been given **Feather Premium** for ${durationText}.\n\n` +
          `${emojis.blackdot} **Exclusive Server Perks:**\n` +
          `› **24/7 Mode**\n` +
          `Keep the bot in voice channels indefinitely.\n\n` +
          `› **Unlimited Queue**\n` +
          `No restrictions on queue size for all members.\n\n` +
          `› **Enhanced Filters**\n` +
          `Access 8D, Nightcore, and Vaporwave filters.\n` +
          `**Smart Autoplay** Intelligent song recommendations.\n\n` +
          `*${days > 0 ? `Expires: <t:${Math.floor(expiryDate.getTime() / 1000)}:R>` : "Duration: Lifetime Access"}*`;

        const dmContainer = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(dmContent),
        );

        // Send to Owner
        try {
          const owner = await targetGuild.fetchOwner();
          await owner
            .send({
              components: [dmContainer.toJSON()],
              flags: MessageFlags.IsComponentsV2,
            })
            .catch(() => {});
        } catch (err) {}

        // Send to Admins (first 5)
        try {
          const admins = targetGuild.members.cache.filter(
            (m) =>
              m.permissions.has("Administrator") &&
              !m.user.bot &&
              m.id !== targetGuild.ownerId,
          );
          let sentCount = 0;
          for (const [id, admin] of admins) {
            if (sentCount >= 5) break;
            await admin
              .send({
                components: [dmContainer.toJSON()],
                flags: MessageFlags.IsComponentsV2,
              })
              .catch(() => {});
            sentCount++;
          }
        } catch (err) {}
      }

      const content =
        `${emojis.feather} **Feather Premium Activated**\n` +
        `› ${emojis.blackdot} **Status:** Activated ✨\n` +
        `**Server:** ${guildName}\n` +
        `**Duration:** ${durationText}\n` +
        `**Expires:** ${expiryText}`;

      return createMsg("Guild Premium Activated", content);
    }

    if (sub === "add") {
      const targetUser = isInteraction
        ? message.options.getUser("user")
        : message.mentions.users.first();
      const days = isInteraction
        ? message.options.getInteger("days") || 0
        : parseInt(args[2] || 0);

      if (!targetUser)
        return createMsg("Invalid Usage", "Please mention a user.", true);

      const existingUser = await User.findOne({ userId: targetUser.id });
      const isUserActive =
        existingUser?.premium &&
        (!existingUser.premiumUntil || existingUser.premiumUntil > Date.now());

      if (isUserActive && days > 0) {
        const expiry = existingUser.premiumUntil
          ? `<t:${Math.floor(existingUser.premiumUntil.getTime() / 1000)}:R>`
          : "Lifetime";
        return createMsg(
          "Already Active",
          `**${targetUser.username}** already has **Feather Premium**! (Expires: ${expiry})`,
          true,
        );
      }

      if (existingUser?.premium && !existingUser.premiumUntil && days === 0) {
        return createMsg(
          "Already Active",
          `**${targetUser.username}** already has **Lifetime** Premium.`,
          true,
        );
      }

      const expiryDate =
        days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
      await User.findOneAndUpdate(
        { userId: targetUser.id },
        { premium: true, premiumUntil: expiryDate },
        { upsert: true },
      );

      // Clear cache
      const { noPrefixCache } = require("../../events/client/messageCreate");
      if (noPrefixCache) noPrefixCache.delete(targetUser.id);

      const durationText = days > 0 ? `**${days} days**` : "**Lifetime**";
      const expiryText =
        days > 0 ? `<t:${Math.floor(expiryDate.getTime() / 1000)}:R>` : "Never";

      // DM Notification
      try {
        const dmContainer = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### ${emojis.feather} Feather Premium Activated!\n` +
              `**You have been given Feather Premium** for ${durationText}. Enjoy your exclusive benefits:\n\n` +
              `${emojis.blackdot} **Exclusive Benefits:**\n` +
              `› **No-Prefix**\n` +
              `Execute commands directly without the prefix.\n\n` +
              `› **24/7 Mode**\n` +
              `Maintain bot connection in voice channels indefinitely.\n\n` +
              `› **Pro Audio Filters**\n` +
              `Enhanced audio processing (8D, Nightcore, Vaporwave).\n\n` +
              `› **Unlimited Access**\n` +
              `No restrictions on queue size or liked songs.\n\n` +
              `› **Smart Autoplay**\n` +
              `Receive intelligent song recommendations.\n\n` +
              `*Thank you for supporting Feather! Type \`/premium status\` to view your details.*`,
          ),
        );
        await targetUser
          .send({
            components: [dmContainer.toJSON()],
            flags: MessageFlags.IsComponentsV2,
          })
          .catch(() => {});
        client.logger.info(
          `[Premium] Sent Activation DM to user ${targetUser.id}`,
        );
      } catch (err) {
        client.logger.error(
          `Failed to DM user ${targetUser.id}: ${err.message}`,
        );
      }

      const content =
        `**${emojis.feather} Feather Premium Activated**\n` +
        `› ${emojis.blackdot} ** Status:** Activated ✨\n` +
        `** User:** ${targetUser.username} \n` +
        `** Duration:** ${durationText} \n` +
        `** Expires:** ${expiryText} `;

      return createMsg("User Premium Activated", content);
    }
  },
};
