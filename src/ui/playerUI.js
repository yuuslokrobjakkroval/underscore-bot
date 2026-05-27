const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  ActionRowBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { formatTime } = require("../utils/formatters");
const metadata = require("../utils/metadata");
const emojis = require("../utils/emojis");

module.exports = {
  createPlayerEmbed: (player) => {
    try {
      const track = player.queue.current;
      if (!track) return null;

      const total = track.length || 0;
      const title = metadata.cleanTitle(track.title);
      const shortTitle = metadata.truncate(title, 40);
      const author = metadata.cleanAuthor(track.author);
      const thumb = metadata.getHighResThumbnail(track.thumbnail);
      const requester = track.requester || {
        displayName: "System",
        username: "System",
        id: "0",
      };

      const paused = !player.playing;

      const container = new ContainerBuilder()
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# ${emojis.vinyl} Now playing`,
              ),
              new TextDisplayBuilder().setContent(`## ${shortTitle}`),
              new TextDisplayBuilder().setContent(
                `> - **Artist:** \`${author}\`\n` +
                  `> - **Duration:** \`${formatTime(total)}\`\n` +
                  `> - **Requester:** \`${requester.displayName ?? requester.username ?? "Unknown"}\``,
              ),
            )
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumb)),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("previous")
              .setEmoji(emojis.backward)
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId("play_pause")
              .setEmoji(paused ? emojis.play : emojis.pause)
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId("skip")
              .setEmoji(emojis.forward)
              .setStyle(ButtonStyle.Secondary),
          ),
        );
      return {
        content: null,
        embeds: [],
        components: [container.toJSON()],
        flags: MessageFlags.IsComponentsV2,
      };
    } catch (error) {
      console.error("Error in createPlayerEmbed:", error);
      return null;
    }
  },
};
