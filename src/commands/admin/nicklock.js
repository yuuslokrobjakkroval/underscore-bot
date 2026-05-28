const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionFlagsBits,
} = require("discord.js");
const Guild = require("../../database/models/guild");
const emojis = require("../../utils/emojis");

const createResponse = (text, isError = false) => ({
  components: [
    new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${isError ? `### ${emojis.error} Error\n> ` : `### ${emojis.config} Nickname Lock\n> `}${text}`,
        ),
      )
      .toJSON(),
  ],
  flags: MessageFlags.IsComponentsV2,
});

module.exports = {
  name: "nicklock",
  aliases: ["botnicklock", "locknick"],
  description: "Lock the bot nickname so users cannot change it.",
  data: new SlashCommandBuilder()
    .setName("nicklock")
    .setDescription("Lock or unlock the bot nickname")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub.setName("status").setDescription("Show bot nickname lock status"),
    )
    .addSubcommand((sub) =>
      sub.setName("enable").setDescription("Lock the bot's current nickname"),
    )
    .addSubcommand((sub) =>
      sub.setName("disable").setDescription("Unlock the bot nickname"),
    ),

  async execute(client, message, args = []) {
    const isInteraction = !!message.options;
    const member = isInteraction ? message.member : message.member;

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return createResponse(
        "You need **Administrator** permissions to use this command.",
        true,
      );
    }

    const sub = isInteraction
      ? message.options.getSubcommand()
      : (args[0] || "status").toLowerCase();

    if (!["status", "enable", "disable", "on", "off"].includes(sub)) {
      return createResponse(
        `Invalid usage. Use \`${client.config.prefix}nicklock status\`, \`enable\`, or \`disable\`.`,
        true,
      );
    }

    if (sub === "status") {
      const guildData = await Guild.findOne({ guildId: message.guild.id });
      const locked = guildData?.settings?.botNicknameLocked || false;
      const nickname = guildData?.settings?.botNickname || client.user.username;

      return createResponse(
        `**Status:** ${locked ? "Locked" : "Unlocked"}\n` +
          `**Locked Nickname:** \`${nickname}\``,
      );
    }

    if (sub === "enable" || sub === "on") {
      const botMember = message.guild.members.me;
      const nickname = botMember.nickname || null;

      await Guild.findOneAndUpdate(
        { guildId: message.guild.id },
        {
          $set: {
            "settings.botNicknameLocked": true,
            "settings.botNickname": nickname,
          },
        },
        { upsert: true, new: true },
      );
      await client.db.refresh(message.guild.id, null);

      return createResponse(
        `Bot nickname is now locked as \`${nickname || client.user.username}\`.`,
      );
    }

    await Guild.findOneAndUpdate(
      { guildId: message.guild.id },
      {
        $set: {
          "settings.botNicknameLocked": false,
          "settings.botNickname": null,
        },
      },
      { upsert: true, new: true },
    );
    await client.db.refresh(message.guild.id, null);

    return createResponse("Bot nickname lock is now disabled.");
  },
};
