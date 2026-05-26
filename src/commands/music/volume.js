const { SlashCommandBuilder, ContainerBuilder, SectionBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'volume',
    aliases: ['vol', 'v'],
    description: 'Change the volume of the music',
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Change the volume of the music')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The volume level (0-100)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(100)),
    async execute(client, message, args) {
        try {
            const isInteraction = !!message.options;
            const guildId = isInteraction ? message.guildId : message.guild.id;
            const member = message.member;

            const player = client.manager.players.get(guildId);

            const createResponse = (text, isError = false, isInfo = false) => {
                const container = new ContainerBuilder().addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${isError ? `> ${emojis.error} ` : isInfo ? `> ${emojis.volume} Volume ` : `> ${emojis.check} `}${text}`)
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

            const volume = isInteraction ? message.options.getInteger('amount') : parseInt(args[0]);

            if (volume === null || volume === undefined || isNaN(volume)) {
                const res = createResponse(`Current volume: **${player.volume}%**`, false, true);
                return isInteraction ? message.reply(res) : message.reply(res);
            }

            if (volume < 0 || volume > 100) {
                const res = createResponse('Volume must be between 0 and 100.', true);
                return isInteraction ? message.reply(res) : message.reply(res);
            }

            player.setVolume(volume);
            const res = createResponse(`Volume set to **${volume}%**.`);
            return isInteraction ? message.reply(res) : message.reply(res);
        } catch (err) {
            client.logger.error(`Volume Command Error: ${err.stack}`);
        }
    }
};
