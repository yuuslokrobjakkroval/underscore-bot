const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SectionBuilder,
  ThumbnailBuilder,
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

  async execute(client, message) {
    const isInteraction = !!message.options;
    const user = isInteraction ? message.user : message.author;

    const isDeveloper = client.config.owners.includes(user.id);
    if (!isDeveloper) {
      return message.reply({
        content: "❌ This command is developer-only.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const guildId = isInteraction ? message.options.getString("guildid") : null;
    if (!guildId) {
      return message.reply({
        content: "❌ Guild ID is required.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const targetGuild = client.guilds.cache.get(guildId);
    if (!targetGuild) {
      return message.reply({
        content: `❌ Guild with ID \`${guildId}\` not found.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const createdAt = Math.floor(targetGuild.createdTimestamp / 1000);
    const owner = await targetGuild.fetchOwner().catch(() => null);

    const container = new ContainerBuilder();
    const section = new SectionBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### ⚠️ Leave Guild Confirmation`),
      new TextDisplayBuilder().setContent(
        `**Guild Name:** ${targetGuild.name}\n` +
          `**Guild ID:** \`${targetGuild.id}\`\n` +
          `**Members:** \`${targetGuild.memberCount}\`\n` +
          `**Owner:** ${owner ? `\`${owner.user.username}\`` : "`Unknown`"}\n` +
          `**Created:** <t:${createdAt}:R>\n\n` +
          `Are you sure you want to leave this guild?`,
      ),
    );

    if (targetGuild.icon) {
      section.setThumbnailAccessory(
        new ThumbnailBuilder().setURL(targetGuild.iconURL({ size: 512 })),
      );
    }

    container.addSectionComponents(section);

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

    return isInteraction
      ? message.reply({
          components: [container.toJSON(), buttons.toJSON()],
          flags: MessageFlags.IsComponentsV2,
        })
      : message.reply({
          components: [container.toJSON(), buttons.toJSON()],
          flags: MessageFlags.IsComponentsV2,
        });
  },
};
