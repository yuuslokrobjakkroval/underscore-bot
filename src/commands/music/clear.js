const { SlashCommandBuilder, ContainerBuilder, SectionBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'clear',
    aliases: ['c'],
    description: 'Clear the music queue',
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clear the music queue'),
    async execute(client, message, args) {
        const isInteraction = !!message.options;
        const guildId = isInteraction ? message.guildId : message.guild.id;
        const player = client.manager.players.get(guildId);
        const createResponse = (text, isError = false) => {
            const container = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`${isError ? `> ${emojis.error} ` : `> ${emojis.delete} Cleared `}${text}`)
            );
            return { components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 };
        };

        if (!player) return message.reply(createResponse(`${emojis.blacklist} There is no music playing.`, true));
        if (!player.queue.length) return message.reply(createResponse(`${emojis.error} The queue is already empty.`, true));

        player.queue.clear();
        message.reply(createResponse(`${emojis.check} Cleared the music queue.`));
    }
};
