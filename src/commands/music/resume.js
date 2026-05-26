const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'resume',
    aliases: ['r'],
    description: 'Resume the current track',
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume the current track'),
    async execute(client, message, args) {
        try {
            const isInteraction = !!message.options;
            const guildId = isInteraction ? message.guildId : message.guild.id;
            const member = message.member;

            const player = client.manager.players.get(guildId);

            const createResponse = (text, isError = false) => {
                const container = new ContainerBuilder().addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${isError ? `> ${emojis.error} ` : `> ${emojis.check} `}${text}`)
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

            if (!player.paused) {
                const res = createResponse('${emojis.blacklist} The player is already playing.', true);
                return isInteraction ? message.reply(res) : message.reply(res);
            }

            player.pause(false);
            const res = createResponse('Resumed the current track.');
            return isInteraction ? message.reply(res) : message.reply(res);
        } catch (err) {
            client.logger.error(`Resume Command Error: ${err.stack}`);
        }
    }
};
