const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionFlagsBits,
} = require("discord.js");

module.exports = {
  name: "guildprefix",
  description: "Set or view guild command prefix",
  data: new SlashCommandBuilder()
    .setName("guildprefix")
    .setDescription("Manage guild prefix")
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Set guild prefix")
        .addStringOption((opt) =>
          opt
            .setName("prefix")
            .setDescription("New prefix (1-5 characters)")
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(5),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("view").setDescription("View current prefix"),
    ),

  async execute(client, message) {
    const isInteraction = !!message.options;
    const guild = message.guild;

    if (!isInteraction) {
      return message.reply({
        content: "This command is slash-command only.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const subcommand = message.options.getSubcommand();

    if (subcommand === "view") {
      const currentPrefix = client.db.getGuildPrefix(guild.id) || "!";

      const container = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### 🔤 Guild Prefix\n> Current prefix: \`${currentPrefix}\``,
        ),
      );

      return message.reply({
        components: [container.toJSON()],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true,
      });
    }

    if (subcommand === "set") {
      const hasPermission = message.member.permissions.has(
        PermissionFlagsBits.Administrator,
      );
      if (!hasPermission) {
        return message.reply({
          content: "❌ You need Administrator permissions.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const newPrefix = message.options.getString("prefix");
      client.db.setGuildPrefix(guild.id, newPrefix);

      const container = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `✅ Guild prefix updated to \`${newPrefix}\``,
        ),
      );

      return message.reply({
        components: [container.toJSON()],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true,
      });
    }
  },
};
