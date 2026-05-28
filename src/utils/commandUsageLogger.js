const { EmbedBuilder } = require('discord.js');

const MAX_DETAIL_LENGTH = 900;

const truncate = (value, maxLength = MAX_DETAIL_LENGTH) => {
    if (!value) return 'None';
    return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
};

const formatTextArgs = (args = []) => truncate(args.join(' ').trim());

const formatInteractionOptions = (options = []) => {
    if (!options.length) return 'None';

    return truncate(options.map((option) => {
        if (option.options?.length) {
            const nested = option.options
                .map((nestedOption) => `${nestedOption.name}: ${nestedOption.value ?? 'None'}`)
                .join(', ');
            return `${option.name} (${nested})`;
        }

        return `${option.name}: ${option.value ?? 'None'}`;
    }).join('\n'));
};

const sendCommandUsageLog = async (client, payload) => {
    const logChannelId = client.config.channels?.log;
    if (!logChannelId) return;

    const channel = await client.channels.fetch(logChannelId).catch(() => null);
    if (!channel?.isTextBased()) return;

    const embed = new EmbedBuilder()
        .setColor(client.config.colors?.accent || '#a855f7')
        .setTitle('Command Used')
        .addFields(
            {
                name: 'User',
                value: `${payload.user.tag} (${payload.user.id})`,
                inline: false,
            },
            {
                name: 'Command',
                value: `\`${payload.commandName}\``,
                inline: true,
            },
            {
                name: 'Type',
                value: payload.type,
                inline: true,
            },
            {
                name: 'Guild',
                value: `${payload.guild?.name || 'Unknown'} (${payload.guild?.id || 'Unknown'})`,
                inline: false,
            },
            {
                name: 'Channel',
                value: payload.channel ? `${payload.channel.name || 'Unknown'} (${payload.channel.id})` : 'Unknown',
                inline: false,
            },
            {
                name: 'Arguments',
                value: payload.details || 'None',
                inline: false,
            },
        )
        .setTimestamp();

    await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
};

const logMessageCommand = (client, message, command, args = []) => sendCommandUsageLog(client, {
    user: message.author,
    guild: message.guild,
    channel: message.channel,
    commandName: command.name,
    type: 'Message',
    details: formatTextArgs(args),
});

const logSlashCommand = (client, interaction, command) => sendCommandUsageLog(client, {
    user: interaction.user,
    guild: interaction.guild,
    channel: interaction.channel,
    commandName: command.name,
    type: 'Slash',
    details: formatInteractionOptions(interaction.options?.data),
});

module.exports = {
    logMessageCommand,
    logSlashCommand,
};
