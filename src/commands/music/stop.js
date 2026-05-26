const { SlashCommandBuilder, ContainerBuilder, SectionBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'stop',
    aliases: ['leave', 'dc'],
    description: 'Stop the music and clear the queue',
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the music and clear the queue'),
    async execute(client, message, args) {
        try {
            const isInteraction = !!message.options;
            const guildId = isInteraction ? message.guildId : message.guild.id;
            const member = message.member;

            const player = client.manager.players.get(guildId);

            const createResponse = (text, isError = false) => {
                const container = new ContainerBuilder().addSectionComponents(
                    new SectionBuilder().addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${isError ? `> ${emojis.error} ` : `> ${emojis.check} `}${text}`)
                    )
                );
                return { components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 };
            };

            if (!player) {
                const res = createResponse('${emojis.blacklist} There is no music playing.', true);
                return isInteraction ? message.reply(res) : message.reply(res);
            }

            const vc = member.voice.channel;
            if (!vc || vc.id !== player.voiceId) {
                const res = createResponse('${emojis.blacklist} You need to be in the same voice channel as the bot.', true);
                return isInteraction ? message.reply(res) : message.reply(res);
            }

            player.destroy();
            const res = createResponse('Stopped the music and cleared the queue.');
            return isInteraction ? message.reply(res) : message.reply(res);
        } catch (err) {
            client.logger.error(`Stop Command Error: ${err.stack}`);
        }
    }
};
