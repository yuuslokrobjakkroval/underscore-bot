const { 
    SlashCommandBuilder, 
    ContainerBuilder, 
    TextDisplayBuilder, 
    MessageFlags,
    PermissionFlagsBits
} = require('discord.js');
const logger = require('../../utils/logger');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'playlofi',
    aliases: ['lofi', 'chill'],
    description: 'Tune into a 24/7 Lo-Fi ambient music stream instantly',
    data: new SlashCommandBuilder()
        .setName('playlofi')
        .setDescription('Tune into a 24/7 Lo-Fi ambient music stream instantly'),

    async execute(client, message, args) {
        const isInteraction = !!message.options;
        const user = isInteraction ? message.user : message.author;
        const guildId = isInteraction ? message.guildId : message.guild.id;
        const member = message.member;

        const createError = (text) => ({
            components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`> ${emojis.error} ${text}`)).toJSON()],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });

        // 1. Check Voice Channel
        const vc = member.voice.channel;
        if (!vc) return message.reply(createError('You need to be in a voice channel first.'));

        if (!message.guild.members.me.permissionsIn(vc).has([PermissionFlagsBits.Connect, PermissionFlagsBits.Speak])) {
            return message.reply(createError("I don't have permissions to join or speak in your channel."));
        }

        let player = client.manager.players.get(guildId);
        if (player && player.voiceId !== vc.id) {
            return message.reply(createError("I'm already playing in another voice channel."));
        }

        if (isInteraction) await message.deferReply();

        // 2. Create or Resolve Player
        if (!player) {
            player = await client.manager.createPlayer({
                guildId: guildId,
                voiceId: vc.id,
                textId: message.channel.id,
                deaf: true
            });
        }

        const LOFI_STREAM_URL = 'https://lofiradio.ru/lofi_mp3_320';

        try {
            // 3. Reset queue and stop current song
            player.queue.clear();
            if (player.playing) player.stop();

            // 4. Resolve Stream Track
            const result = await client.manager.search(LOFI_STREAM_URL, { requester: user });
            if (!result || !result.tracks || result.tracks.length === 0) {
                const res = createError('Failed to tune into the Lo-Fi radio stream.');
                return isInteraction ? message.editReply(res) : message.reply(res);
            }

            const track = result.tracks[0];
            track.title = '🟢 24/7 Lo-Fi Study Beats';
            track.author = 'Feather Radio';
            player.queue.add(track);

            // 5. Store Custom Radio Metadata
            player.data.isRadio = true;
            player.data.radioName = 'Lo-Fi Chill & Study';
            player.data.radioUrl = LOFI_STREAM_URL;

            // 6. Play Immediately
            await player.play();

            const container = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### 🟢 Lo-Fi Connected`),
                new TextDisplayBuilder().setContent(`> Streaming **24/7 Lo-Fi Study Beats** in 320kbps High-Fidelity 📻`)
            );
            const res = { components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 };
            return isInteraction ? message.editReply(res) : message.reply(res);

        } catch (err) {
            logger.error(`PlayLofi Command Error: ${err.stack}`);
            const res = createError('An error occurred while launching the Lo-Fi stream.');
            return isInteraction ? message.editReply(res) : message.reply(res);
        }
    }
};
