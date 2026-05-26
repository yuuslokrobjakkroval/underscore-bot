const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    ThumbnailBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder
} = require('discord.js');
const User = require('../../database/models/user');
const Playlist = require('../../database/models/playlist');
const logger = require('../../utils/logger');
const emojis = require('../../utils/emojis');

// Paste your custom medium-resolution profile banner URL here!
const PROFILE_BANNER_URL = 'https://cdn.discordapp.com/attachments/1500760681488584716/1505917569583026196/feather.png?ex=6a0c5e87&is=6a0b0d07&hm=44aba3dcca17b60124c55e829acad26195da651f8e45a40a358a31169171ef66&';


module.exports = {
    name: 'profile',
    aliases: ['pr', 'userinfo', 'me'],
    description: "View a user's high-fidelity music stats and profile",
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription("View a user's high-fidelity music stats and profile")
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose profile you want to view')
                .setRequired(false)),

    async execute(client, message, args) {
        const isInteraction = !!message.options;
        const targetUser = isInteraction
            ? (message.options.getUser('user') || message.user)
            : (message.mentions.users.first() || message.author);

        const guildId = isInteraction ? message.guildId : message.guild.id;

        if (isInteraction) await message.deferReply();

        try {
            // 1. Fetch User Data
            let userData = await User.findOne({ userId: targetUser.id });
            if (!userData) {
                userData = await User.create({ userId: targetUser.id });
            }

            // 2. Fetch Playlists Count
            const playlistCount = await Playlist.countDocuments({ userId: targetUser.id }) || 0;

            // 3. Determine Tier Status
            const isOwner = client.config.owners.includes(targetUser.id);
            const isPremium = client.db.isPremium(null, targetUser.id) || isOwner;
            let tierText = `${emojis.admin} **Standard Listener**`;

            if (isOwner) {
                tierText = `${emojis.statsDev} **Feather Developer**`;
            } else if (isPremium) {
                if (userData.premiumUntil) {
                    const dateStr = new Date(userData.premiumUntil).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                    tierText = `⭐ **Premium Member** *(Expires: ${dateStr})*`;
                } else {
                    tierText = '⭐ **Premium Member** *(Lifetime)*';
                }
            }

            // 4. Calculate top artist
            let topArtistText = '*No data yet*';
            if (userData.topArtists && userData.topArtists.size > 0) {
                const sortedArtists = Array.from(userData.topArtists.entries())
                    .sort((a, b) => b[1] - a[1]);
                if (sortedArtists.length > 0) {
                    topArtistText = `**${sortedArtists[0][0]}** (${sortedArtists[0][1]} plays)`;
                }
            }

            // 5. Calculate top song
            let topSongText = '*No data yet*';
            if (userData.topSongs && userData.topSongs.length > 0) {
                const sortedSongs = [...userData.topSongs].sort((a, b) => b.count - a.count);
                if (sortedSongs.length > 0 && sortedSongs[0].count > 0) {
                    topSongText = `**${sortedSongs[0].title.substring(0, 45)}** (${sortedSongs[0].count} plays)`;
                }
            }

            const likedCount = userData.likedSongs?.length || 0;
            const historyCount = userData.history?.length || 0;

            // 6. Calculate Listener Level Rank
            let rankText = `${emojis.rankBronze} **Bronze Ear**`;
            if (historyCount > 100) rankText = `${emojis.rankDiamond} **Diamond Maestro**`;
            else if (historyCount > 50) rankText = `${emojis.rankGold} **Gold Audiophile**`;
            else if (historyCount > 15) rankText = `${emojis.rankSilver} **Silver Groover**`;

            // 7. Dynamic VC Now Playing Activity Status
            let liveActivityText = '';
            const player = client.manager.players.get(guildId);
            if (player && player.playing && player.queue.current) {
                const guildObj = isInteraction ? message.guild : message.guild;
                const member = guildObj.members.cache.get(targetUser.id);
                if (member && member.voice.channelId === player.voiceId) {
                    liveActivityText = `\n\n› **Live Activity**\n└ ${emojis.vibe} Currently listening to **${player.queue.current.title.substring(0, 45)}**`;
                }
            }

            // 8. Format Recently Played (Last 3 tracks from history)
            let historyText = '*No listening history yet*';
            if (userData.history && userData.history.length > 0) {
                const recent = userData.history.slice(-3).reverse();
                historyText = recent.map((t, i) => {
                    const isLast = i === recent.length - 1;
                    const bullet = isLast ? '└' : '├';
                    const displayTitle = t.title.length > 35 ? `${t.title.substring(0, 35)}...` : t.title;
                    const displayAuthor = t.author.length > 20 ? `${t.author.substring(0, 20)}...` : t.author;
                    return `${bullet} **${displayTitle}** - *${displayAuthor}*`;
                }).join('\n');
            }

            // 9. Build High-Fidelity UI
            const section = new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${emojis.feather} <@${targetUser.id}>'s Profile`),
                    new TextDisplayBuilder().setContent(
                        `› **Account Tier**\n` +
                        `└ ${tierText}\n\n` +
                        `› **Listener Level**\n` +
                        `└ ${rankText}\n\n` +
                        `› **Library Statistics**\n` +
                        `├ ${emojis.file} **Playlists:** \` ${playlistCount} \` custom lists\n` +
                        `├ ${emojis.agHeart} **Favorites:** \` ${likedCount} \` saved songs\n` +
                        `└ ${emojis.hpBar} **History Size:** \` ${historyCount} \` tracks played\n\n` +
                        `› **Personal Music Charts**\n` +
                        `├ ${emojis.musicAnim} **Top Artist:** ${topArtistText}\n` +
                        `└ ${emojis.nowPlaying} **Favorite Song:** ${topSongText}\n\n` +
                        `› **Recent Listening History**\n` +
                        historyText +
                        liveActivityText
                    )
                )
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(targetUser.displayAvatarURL({ dynamic: true })));

            const container = new ContainerBuilder()
                .addSectionComponents(section)
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

            if (PROFILE_BANNER_URL) {
                container.addMediaGalleryComponents(
                    new MediaGalleryBuilder()
                        .addItems(
                            new MediaGalleryItemBuilder().setURL(PROFILE_BANNER_URL)
                        )
                );
            }

            const res = {
                components: [container.toJSON()],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] }
            };
            return isInteraction ? message.editReply(res) : message.reply(res);

        } catch (err) {
            logger.error(`Profile Command Error: ${err.stack}`);
            const errRes = {
                components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`> ${emojis.error} An error occurred while retrieving the profile.`)).toJSON()],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            };
            return isInteraction ? message.editReply(errRes) : message.reply(errRes);
        }
    }
};
