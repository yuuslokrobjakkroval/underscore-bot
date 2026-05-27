const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionFlagsBits,
} = require("discord.js");

module.exports = {
  name: "guildwelcome",
  description: "Configure welcome and goodbye messages",
  data: new SlashCommandBuilder()
    .setName("guildwelcome")
    .setDescription("Set welcome/goodbye messages")
    .addSubcommand((sub) =>
      sub
        .setName("welcome")
        .setDescription("Set welcome message")
        .addStringOption((opt) =>
          opt
            .setName("message")
            .setDescription(
              "Welcome message ({user} = mention, {guild} = server name)",
            )
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("goodbye")
        .setDescription("Set goodbye message")
        .addStringOption((opt) =>
          opt
            .setName("message")
            .setDescription(
              "Goodbye message ({user} = name, {guild} = server name)",
            )
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("channel")
        .setDescription("Set welcome channel")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Channel for messages")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("view").setDescription("View current settings"),
    ),

  async execute(client, message) {
    const isInteraction = !!message.options;

    if (!isInteraction) {
      return message.reply({
        content: "This command is slash-command only.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const subcommand = message.options.getSubcommand();
    const guild = message.guild;

    const hasPermission = message.member.permissions.has(
      PermissionFlagsBits.Administrator,
    );
    if (!hasPermission && subcommand !== "view") {
      return message.reply({
        content: "❌ You need Administrator permissions.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (subcommand === "view") {
      const settings = client.db.getGuildWelcomeSettings(guild.id) || {};

      const container = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### 👋 Welcome Settings`),
        new TextDisplayBuilder().setContent(
          `**Channel:** ${settings.channelId ? `<#${settings.channelId}>` : "`Not set`"}\n` +
            `**Welcome Message:** \`${settings.welcomeMessage ? "Set" : "Not set"}\`\n` +
            `**Goodbye Message:** \`${settings.goodbyeMessage ? "Set" : "Not set"}\``,
        ),
      );

      return message.reply({
        components: [container.toJSON()],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true,
      });
    }

    if (subcommand === "welcome") {
      const msg = message.options.getString("message");
      client.db.setGuildWelcomeSetting(guild.id, "welcomeMessage", msg);

      return message.reply({
        content: `✅ Welcome message updated.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (subcommand === "goodbye") {
      const msg = message.options.getString("message");
      client.db.setGuildWelcomeSetting(guild.id, "goodbyeMessage", msg);

      return message.reply({
        content: `✅ Goodbye message updated.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (subcommand === "channel") {
      const channel = message.options.getChannel("channel");
      client.db.setGuildWelcomeSetting(guild.id, "channelId", channel.id);

      return message.reply({
        content: `✅ Welcome channel set to ${channel}.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
