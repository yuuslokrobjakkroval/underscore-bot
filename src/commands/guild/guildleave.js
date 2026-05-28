const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

module.exports = {
  name: "guildleave",
  description: "Leave a specific guild with confirmation",
  data: new SlashCommandBuilder()
    .setName("guildleave")
    .setDescription("Leave a guild")
    .addStringOption((opt) =>
      opt
        .setName("guildid")
        .setDescription("The guild ID to leave")
        .setRequired(true),
    ),

  async execute(client, interaction) {
    const user = interaction.user;
    const isDeveloper = client.config.owners.includes(user.id);

    if (!isDeveloper) {
      return interaction.reply({
        content: "❌ This command is developer-only.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const guildId = interaction.options.getString("guildid");
    if (!guildId) {
      return interaction.reply({
        content: "❌ Guild ID is required.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const targetGuild = client.guilds.cache.get(guildId);
    if (!targetGuild) {
      return interaction.reply({
        content: `❌ Guild with ID \`${guildId}\` not found.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const createdAt = Math.floor(targetGuild.createdTimestamp / 1000);
    const owner = await targetGuild.fetchOwner().catch(() => null);

    const embed = new EmbedBuilder()
      .setTitle("⚠️ Leave Guild Confirmation")
      .setColor("#FF0000")
      .addFields(
        {
          name: "Guild Name",
          value: targetGuild.name,
          inline: true,
        },
        {
          name: "Guild ID",
          value: `\`${targetGuild.id}\``,
          inline: true,
        },
        {
          name: "Members",
          value: `\`${targetGuild.memberCount}\``,
          inline: true,
        },
        {
          name: "Owner",
          value: owner ? `\`${owner.user.username}\`` : "`Unknown`",
          inline: true,
        },
        {
          name: "Created",
          value: `<t:${createdAt}:R>`,
          inline: true,
        },
        {
          name: "Action",
          value: "Are you sure you want to leave this guild?",
          inline: false,
        },
      );

    if (targetGuild.icon) {
      embed.setThumbnail(targetGuild.iconURL({ size: 512 }));
    }

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`guildleave_confirm_${guildId}`)
        .setLabel("✓ Leave")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("guildleave_cancel")
        .setLabel("✕ Cancel")
        .setStyle(ButtonStyle.Secondary),
    );

    return interaction.reply({
      embeds: [embed],
      components: [buttons],
      flags: MessageFlags.Ephemeral,
    });
  },
};
