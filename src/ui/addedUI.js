const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  SectionBuilder,
  ThumbnailBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { formatTime } = require("../utils/formatters");
const metadata = require("../utils/metadata");
const emojis = require("../utils/emojis");
const { link } = require("../config/bot");

module.exports = {
  createAddedEmbed: (track, position, user) => {
    const title = metadata.truncate(metadata.cleanTitle(track.title), 35);
    const author = metadata.truncate(metadata.cleanAuthor(track.author), 25);
    const uri =
      track.uri && track.uri.startsWith("http") ? track.uri : link.support;
    const duration = formatTime(track.length);
    const thumb = metadata.getHighResThumbnail(track.thumbnail);

    const section = new SectionBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### ${emojis.check} Track Added`),
      new TextDisplayBuilder().setContent(
        `> [**${title}**](${uri}) by \` ${author} \`\n` +
          `> -# Position \` #${position} \` · Duration \` ${duration} \` · By <@${user.id}>`,
      ),
    );

    if (thumb)
      section.setThumbnailAccessory(new ThumbnailBuilder().setURL(thumb));

    const container = new ContainerBuilder().addSectionComponents(section);

    // Only show Remove/Play Next buttons if not playing first
    if (position > 0) {
      container.addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`remove_${track.identifier}`)
            .setLabel("Remove")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`playnext_${track.identifier}`)
            .setLabel("Play Next")
            .setStyle(ButtonStyle.Secondary),
        ),
      );
    }

    return {
      content: null,
      embeds: [],
      components: [container.toJSON()],
      flags: MessageFlags.IsComponentsV2,
    };
  },
};
