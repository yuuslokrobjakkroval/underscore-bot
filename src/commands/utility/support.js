const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const emojis = require("../../utils/emojis");
const { link } = require("../../config/bot");

module.exports = {
  name: "support",
  description: "Get the link to the support server",
  data: new SlashCommandBuilder()
    .setName("support")
    .setDescription("Get the link to the support server"),
  async execute(client, message, args) {
    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### ${emojis.navigation} Support Server\n> Need help or have suggestions? Join our community!`,
        ),
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("Join Support")
            .setURL(link.support)
            .setStyle(ButtonStyle.Link),
        ),
      );

    return message.reply({
      components: [container.toJSON()],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
