const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  SectionBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require("discord.js");

module.exports = {
  name: "guildsettings",
  description: "Manage guild bot settings",
  data: new SlashCommandBuilder()
    .setName("guildsettings")
    .setDescription("Configure guild settings")
    .addSubcommand((sub) =>
      sub.setName("view").setDescription("View current guild settings"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("autorole")
        .setDescription("Set auto-role for new members")
        .addRoleOption((opt) =>
          opt
            .setName("role")
            .setDescription("Role to auto-assign")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("modlog")
        .setDescription("Set moderation log channel")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Moderation log channel")
            .setRequired(true),
        ),
    ),

  async execute(client, message) {
    const isInteraction = !!message.options;
    const subcommand = isInteraction ? message.options.getSubcommand() : null;
    const guild = message.guild;
    const user = isInteraction ? message.user : message.author;

    if (!isInteraction) {
      return message.reply({
        content: "This command is slash-command only.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const hasPermission = message.member.permissions.has(
      PermissionFlagsBits.Administrator,
    );
    if (!hasPermission) {
      return message.reply({
        content: "❌ You need Administrator permissions to use this command.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (subcommand === "view") {
      const settings = client.db.getGuildSettings(guild.id) || {};

      const container = new ContainerBuilder();
      container.addSectionComponents(
        new SectionBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### ⚙️ Guild Settings`),
          new TextDisplayBuilder().setContent(
            `**Auto Role:** ${settings.autoRole ? `<@&${settings.autoRole}>` : "`Not set`"}\n` +
              `**Mod Log:** ${settings.modlogChannel ? `<#${settings.modlogChannel}>` : "`Not set`"}\n` +
              `**Prefix:** \`${settings.prefix || "Default"}\``,
          ),
        ),
      );

      return message.reply({
        components: [container.toJSON()],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    if (subcommand === "autorole") {
      const role = message.options.getRole("role");
      client.db.setGuildSetting(guild.id, "autoRole", role.id);

      return message.reply({
        content: `✅ Auto-role set to ${role}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (subcommand === "modlog") {
      const channel = message.options.getChannel("channel");
      client.db.setGuildSetting(guild.id, "modlogChannel", channel.id);

      return message.reply({
        content: `✅ Moderation log channel set to ${channel}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
