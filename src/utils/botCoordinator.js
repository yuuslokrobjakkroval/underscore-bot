const BotAssignment = require('../database/models/botAssignment');

const CLAIM_TTL_MS = 45_000;

function getFamilyBotIds(client) {
    const configured = (process.env.MUSIC_BOT_IDS || '')
        .split(',')
        .map(id => id.trim())
        .filter(Boolean);

    return [...new Set([...configured, client.user.id])];
}

function getPrimaryBotId(client) {
    return getFamilyBotIds(client)[0];
}

function isInteraction(message) {
    return !!message.options;
}

function findFamilyBotInVoice(voiceChannel, familyBotIds) {
    return voiceChannel.members.find(member =>
        member.user.bot && familyBotIds.includes(member.id)
    );
}

async function claimVoiceChannel(client, voiceChannel) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CLAIM_TTL_MS);

    try {
        const assignment = await BotAssignment.findOneAndUpdate(
            {
                guildId: voiceChannel.guild.id,
                voiceId: voiceChannel.id,
                $or: [
                    { expiresAt: { $lte: now } },
                    { botId: client.user.id },
                ],
            },
            {
                $set: {
                    botId: client.user.id,
                    botTag: client.user.tag,
                    expiresAt,
                },
                $setOnInsert: {
                    guildId: voiceChannel.guild.id,
                    voiceId: voiceChannel.id,
                },
            },
            {
                upsert: true,
                returnDocument: 'after',
            },
        );

        return assignment?.botId === client.user.id;
    } catch (error) {
        if (error?.code !== 11000) throw error;
        return false;
    }
}

async function resolveMusicBot(client, message) {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
        return {
            allowed: false,
            silent: false,
            reason: 'You need to be in a voice channel first.',
        };
    }

    const familyBotIds = getFamilyBotIds(client);
    const existingBot = findFamilyBotInVoice(voiceChannel, familyBotIds);

    if (existingBot) {
        if (existingBot.id === client.user.id) {
            return { allowed: true, voiceChannel };
        }

        return {
            allowed: false,
            silent: !isInteraction(message),
            reason: `You already have <@${existingBot.id}> in your voice channel.`,
        };
    }

    const claimed = await claimVoiceChannel(client, voiceChannel);
    if (!claimed) {
        return {
            allowed: false,
            silent: !isInteraction(message),
            reason: 'Another music bot is already being assigned to your voice channel.',
        };
    }

    return { allowed: true, voiceChannel, claimed: true };
}

async function resolveCommandBot(client, message, options = {}) {
    if (options.isDirectMention || isInteraction(message)) {
        return { allowed: true };
    }

    const familyBotIds = getFamilyBotIds(client);
    if (familyBotIds.length <= 1) {
        return { allowed: true };
    }

    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
        const primaryBotId = getPrimaryBotId(client);

        return {
            allowed: client.user.id === primaryBotId,
            silent: client.user.id !== primaryBotId,
            reason: `Please use <@${primaryBotId}> for commands when you are not in a voice channel.`,
        };
    }

    const existingBot = findFamilyBotInVoice(voiceChannel, familyBotIds);
    if (existingBot) {
        return {
            allowed: existingBot.id === client.user.id,
            silent: existingBot.id !== client.user.id,
            reason: `You already have <@${existingBot.id}> in your voice channel.`,
        };
    }

    const claimed = await claimVoiceChannel(client, voiceChannel);
    return {
        allowed: claimed,
        silent: !claimed,
        reason: 'Another music bot is already being assigned to your voice channel.',
    };
}

module.exports = {
    resolveMusicBot,
    resolveCommandBot,
    getFamilyBotIds,
};
