const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  SectionBuilder,
  ThumbnailBuilder,
} = require("discord.js");
const { formatTime } = require("../../utils/formatters");

module.exports = {
  name: "guildinfo",
  description: "Display guild information and statistics",
  data: new SlashCommandBuilder()
    .setName("guildinfo")
    .setDescription("View detailed guild information"),

  async execute(client, message) {
    const isInteraction = !!message.options;
    const guild = message.guild;

    const createdAt = Math.floor(guild.createdTimestamp / 1000);
    const memberCount = guild.memberCount;
    const onlineCount = guild.members.cache.filter(
      (m) => m.presence?.status !== "offline",
    ).size;
    const botCount = guild.members.cache.filter((m) => m.user.bot).size;
    const roleCount = guild.roles.cache.size;
    const channelCount = guild.channels.cache.size;

    const owner = await guild.fetchOwner();
    const verificationLevel = guild.verificationLevel;
    const contentFilter = guild.explicitContentFilter;

    const container = new ContainerBuilder();

    const section = new SectionBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### 📊 ${guild.name} Information`),
      new TextDisplayBuilder().setContent(
        `**Owner:** \`${owner.user.username}\`\n` +
          `**Created:** <t:${createdAt}:R>\n` +
          `**Region:** \`${guild.preferredLocale || "Unknown"}\`\n` +
          `**Verification:** \`${verificationLevel}\``,
      ),
      new TextDisplayBuilder().setContent(
        `**Members:** \`${memberCount}\` (${onlineCount} online)\n` +
          `**Bots:** \`${botCount}\`\n` +
          `**Roles:** \`${roleCount}\`\n` +
          `**Channels:** \`${channelCount}\``,
      ),
    );

    if (guild.icon) {
      section.setThumbnailAccessory(
        new ThumbnailBuilder().setURL(guild.iconURL({ size: 512 })),
      );
    }

    container.addSectionComponents(section);

    const response = {
      components: [container.toJSON()],
      flags: MessageFlags.IsComponentsV2,
    };
    return isInteraction ? message.reply(response) : message.reply(response);
  },
};
