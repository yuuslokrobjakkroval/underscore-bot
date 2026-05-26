const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'resetfilters',
    aliases: ['rf', 'clearfilters'],
    description: 'Reset all active audio filters',
    data: new SlashCommandBuilder()
        .setName('resetfilters')
        .setDescription('Reset all active audio filters'),
    async execute(client, message, args) {
        const isInteraction = !!message.options;
        const guildId = isInteraction ? message.guildId : message.guild.id;
        const player = client.manager.players.get(guildId);
        if (!player) {
            const errContainer = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`> ${emojis.error} No music playing.`)
            );
            return message.reply({ components: [errContainer.toJSON()], flags: MessageFlags.IsComponentsV2 });
        }

        player.shoukaku.setFilters({});
        player.data.nightcore = false;
        player.data.bassboost = false;
        player.data['8d'] = false;
        player.data.vaporwave = false;

        const container = new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`> ${emojis.check} All audio filters have been **reset**.`)
        );
        return message.reply({ components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 });
    }
};
