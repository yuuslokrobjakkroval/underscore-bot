const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'bassboost',
    description: 'Toggle bassboost filter',
    data: new SlashCommandBuilder()
        .setName('bassboost')
        .setDescription('Toggle bassboost filter'),
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

        const current = player.data.bassboost || false;
        player.data.bassboost = !current;

        if (!current) {
            player.shoukaku.setFilters({
                equalizer: [
                    { band: 0, gain: 0.15 },
                    { band: 1, gain: 0.15 },
                    { band: 2, gain: 0.15 },
                    { band: 3, gain: 0.15 },
                    { band: 4, gain: 0.15 },
                    { band: 5, gain: 0.15 }
                ]
            });
        } else {
            player.shoukaku.setFilters({});
        }

        const container = new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`> ${emojis.check} Bassboost has been **${!current ? 'enabled' : 'disabled'}**.`)
        );
        return message.reply({ components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 });
    }
};
