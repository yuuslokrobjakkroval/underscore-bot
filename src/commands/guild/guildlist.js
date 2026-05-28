const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

module.exports = {
  name: "guildlist",
  description: "List all guilds the bot is in with pagination",
  data: new SlashCommandBuilder()
    .setName("guildlist")
    .setDescription("View all guilds with detailed information"),

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

    const guilds = Array.from(client.guilds.cache.values());
    if (guilds.length === 0) {
      return message.reply({
        content: "No guilds found.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const guildsPerPage = 10;
    const totalPages = Math.ceil(guilds.length / guildsPerPage);

    const createPage = (page) => {
      const start = (page - 1) * guildsPerPage;
      const end = start + guildsPerPage;
      const pageGuilds = guilds.slice(start, end);

      const embed = new EmbedBuilder()
        .setTitle("🏢 Guild List")
        .setColor("#5865F2")
        .setFooter({
          text: `Page ${page}/${totalPages} • Total: ${guilds.length} guilds`,
        });

      pageGuilds.forEach((g, idx) => {
        const createdAt = Math.floor(g.createdTimestamp / 1000);
        embed.addFields({
          name: `${start + idx + 1}. ${g.name}`,
          value:
            `ID: \`${g.id}\`\n` +
            `Members: \`${g.memberCount}\`\n` +
            `Owner: \`${g.ownerId}\`\n` +
            `Created: <t:${createdAt}:R>`,
          inline: false,
        });
      });

      const buttons = new ActionRowBuilder();
      if (page > 1) {
        buttons.addComponents(
          new ButtonBuilder()
            .setCustomId(`guildlist_prev_${page}`)
            .setLabel("◀ Previous")
            .setStyle(ButtonStyle.Primary),
        );
      }

      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId("guildlist_dummy")
          .setLabel(`${page}/${totalPages}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
      );

      if (page < totalPages) {
        buttons.addComponents(
          new ButtonBuilder()
            .setCustomId(`guildlist_next_${page}`)
            .setLabel("Next ▶")
            .setStyle(ButtonStyle.Primary),
        );
      }

      return {
        embeds: [embed],
        components: [buttons],
      };
    };

    return isInteraction
      ? message.reply(createPage(1))
      : message.reply(createPage(1));
  },
};
