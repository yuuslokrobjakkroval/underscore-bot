const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags, SectionBuilder, ThumbnailBuilder, SeparatorBuilder } = require('discord.js');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'devs',
    aliases: ['developers', 'team', 'staff'],
    description: 'Display information about the bot developers',
    data: new SlashCommandBuilder()
        .setName('devs')
        .setDescription('Display information about the bot developers'),
    async execute(client, message, args) {
        const isInteraction = !!message.options;
        const ownerIds = client.config.owners;

        try {
            const devProfiles = await Promise.all(
                ownerIds.map(id => client.users.fetch(id).catch(() => null))
            );

            const validDevs = devProfiles.filter(dev => dev !== null);

            const container = new ContainerBuilder();

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### ${emojis.admin} Development Team\n> This bot is maintained by a dedicated team of developers.`)
            );

            container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

            validDevs.forEach((dev, index) => {
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `> \`${index + 1}.\` **${dev.globalName || dev.username}** · [\`View Profile\`](https://discord.com/users/${dev.id})`
                    )
                );
            });

            const res = { components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 };
            return isInteraction ? message.reply(res) : message.reply(res);
        } catch (error) {
            client.logger.error(`Devs command error: ${error.stack}`);
            return message.reply({ content: 'An error occurred while fetching developer info.', ephemeral: true });
        }
    }
};
