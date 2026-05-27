const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  SectionBuilder,
} = require("discord.js");

module.exports = {
  name: "membercount",
  description: "Display guild member statistics",
  data: new SlashCommandBuilder()
    .setName("membercount")
    .setDescription("View detailed member statistics"),

  async execute(client, message) {
    const isInteraction = !!message.options;
    const guild = message.guild;

    const totalMembers = guild.memberCount;
    const humans = guild.members.cache.filter((m) => !m.user.bot).size;
    const bots = guild.members.cache.filter((m) => m.user.bot).size;
    const online = guild.members.cache.filter(
      (m) => m.presence?.status !== "offline",
    ).size;
    const offline = totalMembers - online;

    const userStatuses = {
      online: guild.members.cache.filter((m) => m.presence?.status === "online")
        .size,
      idle: guild.members.cache.filter((m) => m.presence?.status === "idle")
        .size,
      dnd: guild.members.cache.filter((m) => m.presence?.status === "dnd").size,
      offline: offline,
    };

    const container = new ContainerBuilder();
    container.addSectionComponents(
      new SectionBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### 👥 Member Statistics`),
        new TextDisplayBuilder().setContent(
          `**Total Members:** \`${totalMembers}\`\n` +
            `**Humans:** \`${humans}\`\n` +
            `**Bots:** \`${bots}\``,
        ),
        new TextDisplayBuilder().setContent(
          `**🟢 Online:** \`${userStatuses.online}\`\n` +
            `**🟡 Idle:** \`${userStatuses.idle}\`\n` +
            `**🔴 DND:** \`${userStatuses.dnd}\`\n` +
            `⚫ **Offline:** \`${userStatuses.offline}\``,
        ),
      ),
    );

    const response = {
      components: [container.toJSON()],
      flags: MessageFlags.IsComponentsV2,
    };
    return isInteraction ? message.reply(response) : message.reply(response);
  },
};
