const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  SectionBuilder,
} = require("discord.js");

module.exports = {
  name: "guildroles",
  description: "Display all guild roles",
  data: new SlashCommandBuilder()
    .setName("guildroles")
    .setDescription("View all roles in the guild"),

  async execute(client, message) {
    const isInteraction = !!message.options;
    const guild = message.guild;

    const roles = guild.roles.cache
      .filter((r) => r.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .slice(0, 25);

    if (roles.size === 0) {
      const container = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent("No roles found in this guild."),
      );
      return isInteraction
        ? message.reply({
            components: [container.toJSON()],
            flags: MessageFlags.IsComponentsV2,
          })
        : message.reply({
            components: [container.toJSON()],
            flags: MessageFlags.IsComponentsV2,
          });
    }

    const roleList = roles
      .map((r) => `<@&${r.id}> · \`${r.members.size}\` members`)
      .join("\n");

    const container = new ContainerBuilder();
    container.addSectionComponents(
      new SectionBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### 👥 Guild Roles (${guild.roles.cache.size})`,
        ),
        new TextDisplayBuilder().setContent(roleList),
      ),
    );

    const response = {
      components: [container.toJSON()],
      flags: MessageFlags.IsComponentsV2,
    };
    return isInteraction ? message.reply(response) : message.reply(response);
  },
};
