const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");
const emojis = require("../../utils/emojis");

const createMsg = (text) => ({
  content: null,
  embeds: [],
  components: [
    new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(text))
      .toJSON(),
  ],
  flags: MessageFlags.IsComponentsV2,
});

const truncate = (str, len) => {
  if (!str) return "Unknown";
  return str.length > len ? str.substring(0, len - 3) + "..." : str;
};

module.exports = {
  name: "queue",
  aliases: ["q"],
  description: "Show the current music queue with cleaned and truncated titles",
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Show the current music queue"),
  async execute(client, message, args) {
    try {
      const isInteraction = !!message.options;
      const guildId = isInteraction ? message.guildId : message.guild.id;

      const player = client.manager.players.get(guildId);
      if (!player) {
        const res = createMsg("> ${emojis.error} There is no music playing.");
        return isInteraction ? message.reply(res) : message.reply(res);
      }

      const current = player.queue.current;
      const queue = player.queue;

      if (!current && !queue.length) {
        const res = createMsg("> ${emojis.error} The queue is empty.");
        return isInteraction ? message.reply(res) : message.reply(res);
      }

      // Truncate Now Playing title (limit to 45 for header)
      const currentTitle = truncate(current.title, 45);

      let queueString = `### ${emojis.vinyl} Current Queue\n`;
      queueString += `> **Now Playing:** [${currentTitle}](${current.uri}) \`[${formatDuration(current.length)}]\`\n\n`;

      if (queue.length > 0) {
        queueString += `**Up Next:**\n`;
        queueString += queue
          .slice(0, 10)
          .map((track, i) => {
            const title = truncate(track.title, 30);
            return `> \`${i + 1}.\` [${title}](${track.uri}) \`[${formatDuration(track.length)}]\``;
          })
          .join("\n");

        if (queue.length > 10) {
          queueString += `\n\n-# ...and ${queue.length - 10} more tracks`;
        }
      } else {
        queueString += `-# No tracks in queue`;
      }

      const container = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(queueString),
      );

      const res = {
        components: [container.toJSON()],
        flags: MessageFlags.IsComponentsV2,
      };

      return isInteraction ? message.reply(res) : message.reply(res);
    } catch (err) {
      client.logger.error(`Queue Command Error: ${err.stack}`);
      return message.reply({
        content: "An error occurred while displaying the queue.",
        ephemeral: true,
      });
    }
  },
};

function formatDuration(ms) {
  if (!ms || isNaN(ms)) return "0:00";
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

  return [
    hours > 0 ? hours : null,
    minutes.toString().padStart(hours > 0 ? 2 : 1, "0"),
    seconds.toString().padStart(2, "0"),
  ]
    .filter(Boolean)
    .join(":");
}
