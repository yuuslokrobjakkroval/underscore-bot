const { SlashCommandBuilder, ContainerBuilder, SectionBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'move',
    description: 'Move a track to a different position in the queue',
    data: new SlashCommandBuilder()
        .setName('move')
        .setDescription('Move a track to a different position in the queue')
        .addIntegerOption(opt => opt.setName('from').setDescription('Current position').setRequired(true))
        .addIntegerOption(opt => opt.setName('to').setDescription('New position').setRequired(true)),
    async execute(client, message, args) {
        const isInteraction = !!message.options;
        const guildId = isInteraction ? message.guildId : message.guild.id;
        const player = client.manager.players.get(guildId);
        const createResponse = (text, isError = false) => {
            const container = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`${isError ? `> ${emojis.error} ` : `> ${emojis.check} `}${text}`)
            );
            return { content: null, embeds: [], components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 };
        };

        if (!player) return message.reply(createResponse('${emojis.blacklist} There is no music playing.', true));

        const from = isInteraction ? message.options.getInteger('from') : parseInt(args[0]);
        const to = isInteraction ? message.options.getInteger('to') : parseInt(args[1]);

        if (isNaN(from) || isNaN(to) || from < 1 || to < 1 || from > player.queue.length || to > player.queue.length) {
            const p = client.config.prefix;
            return message.reply(createResponse(`**Invalid Usage!**\n> **Correct Usage:** \`${p}move <from> <to>\` (e.g. \`${p}move 5 1\`)\n> *Range must be between 1 and ${player.queue.length}.*`, true));
        }

        if (from === to) return message.reply(createResponse('${emojis.blacklist} Track is already at that position.', true));

        // Use direct array manipulation if remove/add are failing
        const track = player.queue[from - 1];

        // Remove and then Insert at target
        // We use player.queue.splice if available, otherwise manual manipulation
        if (typeof player.queue.splice === 'function') {
            player.queue.splice(from - 1, 1);
            player.queue.splice(to - 1, 0, track);
        } else {
            // Standard Kazagumo method fallback with better ordering
            player.queue.remove(from - 1);
            player.queue.add(track, to - 1);
        }

        message.reply(createResponse(`Moved **${track.title}** to position **${to}**.`));
    }
};
