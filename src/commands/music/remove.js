const { SlashCommandBuilder, ContainerBuilder, SectionBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'remove',
    aliases: ['rem', 'rm'],
    description: 'Remove a track from the queue',
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a track from the queue')
        .addIntegerOption(option =>
            option.setName('position')
                .setDescription('The position of the track to remove')
                .setRequired(true)),
    async execute(client, message, args) {
        const isInteraction = !!message.options;
        const guildId = isInteraction ? message.guildId : message.guild.id;
        const player = client.manager.players.get(guildId);
        const createResponse = (text, isError = false) => {
            const container = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`${isError ? `> ${emojis.error} ` : `> ${emojis.delete} `}${text}`)
            );
            return { components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 };
        };

        if (!player) return message.reply(createResponse('There is no music playing.', true));

        const position = isInteraction ? message.options.getInteger('position') : parseInt(args[0]);
        if (isNaN(position) || position < 1 || position > player.queue.length) {
            const p = client.config.prefix;
            return message.reply(createResponse(`**Invalid Usage!**\n> **Correct Usage:** \`${p}remove <position>\` (e.g. \`${p}remove 3\`)\n> *Position must be between 1 and ${player.queue.length}.*`, true));
        }

        const removed = player.queue.remove(position - 1);
        message.reply(createResponse(`Removed **${removed.title}** from the queue.`));
    }
};
