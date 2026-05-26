const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'nightcore',
    description: 'Toggle nightcore filter',
    premium: true,
    data: new SlashCommandBuilder()
        .setName('nightcore')
        .setDescription('Toggle nightcore filter'),
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

        const current = player.data.nightcore || false;
        player.data.nightcore = !current;

        if (!current) {
            player.shoukaku.setFilters({
                timescale: { speed: 1.2, pitch: 1.2, rate: 1.0 }
            });
        } else {
            player.shoukaku.setFilters({});
        }

        const container = new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`> ${emojis.check} Nightcore has been **${!current ? 'enabled' : 'disabled'}**.`)
        );
        return message.reply({ components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 });
    }
};
