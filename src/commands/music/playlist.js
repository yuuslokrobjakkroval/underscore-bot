const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  SectionBuilder,
  ThumbnailBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const Playlist = require("../../database/models/playlist");
const User = require("../../database/models/user");
const Guild = require("../../database/models/guild");
const metadata = require("../../utils/metadata");
const { formatTime } = require("../../utils/formatters");
const logger = require("../../utils/logger");
const emojis = require("../../utils/emojis");

module.exports = {
  name: "playlist",
  aliases: ["pl"],
  description: "Create, edit, and play your custom playlists",
  data: new SlashCommandBuilder()
    .setName("playlist")
    .setDescription("Manage your custom playlists")
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Create a new custom playlist")
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("Name of the playlist")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("delete")
        .setDescription("Delete one of your custom playlists")
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("Name of the playlist")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Add a song to a playlist")
        .addStringOption((opt) =>
          opt
            .setName("playlist")
            .setDescription("Name of the playlist")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("query")
            .setDescription(
              "Song name or URL (leave empty to add currently playing)",
            )
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove a song from a playlist by index")
        .addStringOption((opt) =>
          opt
            .setName("playlist")
            .setDescription("Name of the playlist")
            .setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("index")
            .setDescription("Track number to remove (1-indexed)")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("List all your custom playlists"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("view")
        .setDescription("View all songs in a playlist")
        .addStringOption((opt) =>
          opt
            .setName("playlist")
            .setDescription("Name of the playlist")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("play")
        .setDescription("Play all songs in a custom playlist")
        .addStringOption((opt) =>
          opt
            .setName("playlist")
            .setDescription("Name of the playlist")
            .setRequired(true),
        ),
    ),

  async execute(client, message, args) {
    const isInteraction = !!message.options;
    const sub = isInteraction
      ? message.options.getSubcommand()
      : (args[0] || "list").toLowerCase();
    const user = isInteraction ? message.user : message.author;
    const guildId = isInteraction ? message.guildId : message.guild.id;

    const isPremium =
      client.db.isPremium(guildId, user.id) ||
      client.config.owners.includes(user.id);

    const createError = (text) => ({
      components: [
        new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`> ${emojis.error} ${text}`),
          )
          .toJSON(),
      ],
      flags: MessageFlags.IsComponentsV2,
      ephemeral: true,
    });

    const createSuccess = (title, text) => {
      const container = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### ${emojis.check} ${title}`),
        new TextDisplayBuilder().setContent(`> ${text}`),
      );
      return {
        components: [container.toJSON()],
        flags: MessageFlags.IsComponentsV2,
      };
    };

    const createPremiumRequired = (text) => {
      const container = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### ✨ Premium Required\n> ${text}\n> Upgrade to **Premium** to unlock unlimited custom playlists!`,
        ),
      );
      return {
        components: [container.toJSON()],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true,
      };
    };

    if (isInteraction && !message.deferred && sub === "play") {
      await message.deferReply();
    }

    // Subcommands Router
    switch (sub) {
      case "create": {
        const name = (
          isInteraction
            ? message.options.getString("name")
            : args.slice(1).join(" ")
        ).trim();
        if (!name)
          return message.reply(createError("Please provide a playlist name."));

        const plCount = await Playlist.countDocuments({ userId: user.id });
        const PLAYLIST_LIMIT = 3;

        if (!isPremium && plCount >= PLAYLIST_LIMIT) {
          return message.reply(
            createPremiumRequired(
              `You've reached the limit of **${PLAYLIST_LIMIT}** custom playlists.`,
            ),
          );
        }

        // Check case-insensitive duplicate
        const exists = await Playlist.findOne({
          userId: user.id,
          name: {
            $regex: new RegExp(
              "^" + name.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "$",
              "i",
            ),
          },
        });
        if (exists)
          return message.reply(
            createError(`You already have a playlist named **${name}**!`),
          );

        await Playlist.create({
          userId: user.id,
          name: name,
          tracks: [],
        });

        return message.reply(
          createSuccess(
            "Playlist Created",
            `Successfully created custom playlist **${name}**.`,
          ),
        );
      }

      case "delete": {
        const name = (
          isInteraction
            ? message.options.getString("name")
            : args.slice(1).join(" ")
        ).trim();
        if (!name)
          return message.reply(
            createError("Please provide a playlist name to delete."),
          );

        const deleted = await Playlist.findOneAndDelete({
          userId: user.id,
          name: {
            $regex: new RegExp(
              "^" + name.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "$",
              "i",
            ),
          },
        });

        if (!deleted)
          return message.reply(
            createError(`Could not find a playlist named **${name}**.`),
          );
        return message.reply(
          createSuccess(
            "Playlist Deleted",
            `Successfully deleted custom playlist **${deleted.name}**.`,
          ),
        );
      }

      case "add": {
        let name = "";
        let query = "";

        if (isInteraction) {
          name = message.options.getString("playlist").trim();
          query = (message.options.getString("query") || "").trim();
        } else {
          name = args[1];
          query = args.slice(2).join(" ").trim();
        }

        if (!name)
          return message.reply(
            createError(
              "Please provide the playlist name. Usage: `,playlist add <playlist_name> [query]`",
            ),
          );

        const playlist = await Playlist.findOne({
          userId: user.id,
          name: {
            $regex: new RegExp(
              "^" + name.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "$",
              "i",
            ),
          },
        });

        if (!playlist)
          return message.reply(
            createError(`Could not find a playlist named **${name}**.`),
          );

        const TRACKS_LIMIT = 15;
        if (!isPremium && playlist.tracks.length >= TRACKS_LIMIT) {
          return message.reply(
            createPremiumRequired(
              `Standard playlists are limited to **${TRACKS_LIMIT}** tracks.`,
            ),
          );
        }

        let tracksToAdd = [];
        if (query) {
          if (isInteraction) await message.deferReply();
          try {
            const searchResult = await client.manager.search(query, {
              requester: user,
            });
            if (
              !searchResult ||
              !searchResult.tracks ||
              searchResult.tracks.length === 0
            ) {
              const err = createError("No results found for your query.");
              return isInteraction
                ? message.editReply(err)
                : message.reply(err);
            }

            if (searchResult.type === "PLAYLIST") {
              tracksToAdd = searchResult.tracks.map((t) => ({
                title: metadata.cleanTitle(t.title),
                author: metadata.cleanAuthor(t.author),
                uri: t.uri,
                identifier: t.identifier,
                thumbnail: t.thumbnail,
                length: t.length,
              }));
            } else {
              const t = searchResult.tracks[0];
              tracksToAdd = [
                {
                  title: metadata.cleanTitle(t.title),
                  author: metadata.cleanAuthor(t.author),
                  uri: t.uri,
                  identifier: t.identifier,
                  thumbnail: t.thumbnail,
                  length: t.length,
                },
              ];
            }
          } catch (e) {
            logger.error(`Playlist search failed: ${e.stack}`);
            const err = createError("Failed to resolve track search.");
            return isInteraction ? message.editReply(err) : message.reply(err);
          }
        } else {
          // Fallback to currently playing
          const player = client.manager.players.get(guildId);
          if (!player || !player.queue.current) {
            return message.reply(
              createError(
                "No music is currently playing. Please specify a song name or link to add.",
              ),
            );
          }
          const t = player.queue.current;
          tracksToAdd = [
            {
              title: metadata.cleanTitle(t.title),
              author: metadata.cleanAuthor(t.author),
              uri: t.uri,
              identifier: t.identifier,
              thumbnail: t.thumbnail,
              length: t.length,
            },
          ];
        }

        // Check Limit again after adding
        if (
          !isPremium &&
          playlist.tracks.length + tracksToAdd.length > TRACKS_LIMIT
        ) {
          const allowedCount = TRACKS_LIMIT - playlist.tracks.length;
          if (allowedCount <= 0) {
            const err = createPremiumRequired(
              `Standard playlists are limited to **${TRACKS_LIMIT}** tracks.`,
            );
            return isInteraction ? message.editReply(err) : message.reply(err);
          }
          tracksToAdd = tracksToAdd.slice(0, allowedCount);
        }

        playlist.tracks.push(...tracksToAdd);
        await playlist.save();

        const responseText =
          tracksToAdd.length === 1
            ? `Added **${metadata.truncate(tracksToAdd[0].title, 40)}** to playlist **${playlist.name}**.`
            : `Added **${tracksToAdd.length}** tracks to playlist **${playlist.name}**.`;

        const res = createSuccess("Track Added", responseText);
        return isInteraction ? message.editReply(res) : message.reply(res);
      }

      case "remove": {
        let name = "";
        let index = 0;

        if (isInteraction) {
          name = message.options.getString("playlist").trim();
          index = message.options.getInteger("index");
        } else {
          name = args[1];
          index = parseInt(args[2]);
        }

        if (!name || isNaN(index)) {
          return message.reply(
            createError(
              "Invalid parameters. Usage: `,playlist remove <playlist_name> <song_number>`",
            ),
          );
        }

        const playlist = await Playlist.findOne({
          userId: user.id,
          name: {
            $regex: new RegExp(
              "^" + name.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "$",
              "i",
            ),
          },
        });

        if (!playlist)
          return message.reply(
            createError(`Could not find a playlist named **${name}**.`),
          );

        if (index < 1 || index > playlist.tracks.length) {
          return message.reply(
            createError(
              `Invalid track index. Playlist has **${playlist.tracks.length}** tracks.`,
            ),
          );
        }

        const removed = playlist.tracks.splice(index - 1, 1)[0];
        await playlist.save();

        return message.reply(
          createSuccess(
            "Track Removed",
            `Removed **${metadata.truncate(removed.title, 40)}** from playlist **${playlist.name}**.`,
          ),
        );
      }

      case "list": {
        const playlists = await Playlist.find({ userId: user.id }).sort({
          createdAt: -1,
        });

        if (!playlists || playlists.length === 0) {
          const emptyContainer =
            new ContainerBuilder().addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `### ${emojis.error} No Playlists\n> You haven't created any custom playlists yet.\n> Use \`/playlist create <name>\` to make one!`,
              ),
            );
          return message.reply({
            components: [emptyContainer.toJSON()],
            flags: MessageFlags.IsComponentsV2,
          });
        }

        let text = `You have **${playlists.length}** custom playlist(s).\n\n`;
        playlists.forEach((pl, i) => {
          text += `**${pl.name}** · \` ${pl.tracks.length} tracks \` · Created <t:${Math.floor(pl.createdAt.getTime() / 1000)}:R>\n`;
        });

        const listContainer = new ContainerBuilder().addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent("### Custom Playlists"),
              new TextDisplayBuilder().setContent(text),
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(client.user.displayAvatarURL()),
            ),
        );

        return message.reply({
          components: [listContainer.toJSON()],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      case "view": {
        const name = (
          isInteraction
            ? message.options.getString("playlist")
            : args.slice(1).join(" ")
        ).trim();
        if (!name)
          return message.reply(
            createError("Please provide a playlist name to view."),
          );

        const playlist = await Playlist.findOne({
          userId: user.id,
          name: {
            $regex: new RegExp(
              "^" + name.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "$",
              "i",
            ),
          },
        });

        if (!playlist)
          return message.reply(
            createError(`Could not find a playlist named **${name}**.`),
          );

        if (playlist.tracks.length === 0) {
          const emptyContainer =
            new ContainerBuilder().addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `### 📂 Playlist: ${playlist.name}\n> This playlist is currently empty.\n> Add songs using \`/playlist add ${playlist.name} <song>\`!`,
              ),
            );
          return message.reply({
            components: [emptyContainer.toJSON()],
            flags: MessageFlags.IsComponentsV2,
          });
        }

        let text = `Total tracks: \` ${playlist.tracks.length} \`\n\n`;
        playlist.tracks.slice(0, 15).forEach((t, i) => {
          text += `**${i + 1}.** [${metadata.truncate(t.title, 35)}](${t.uri}) · \`${formatTime(t.length)}\`\n`;
        });

        if (playlist.tracks.length > 15) {
          text += `\n*... and ${playlist.tracks.length - 15} more tracks.*`;
        }

        const viewContainer = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### Playlist: ${playlist.name}`),
          new TextDisplayBuilder().setContent(text),
        );

        return message.reply({
          components: [viewContainer.toJSON()],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      case "play": {
        const name = (
          isInteraction
            ? message.options.getString("playlist")
            : args.slice(1).join(" ")
        ).trim();
        if (!name) {
          const err = createError("Please provide a playlist name to play.");
          return isInteraction ? message.editReply(err) : message.reply(err);
        }

        const playlist = await Playlist.findOne({
          userId: user.id,
          name: {
            $regex: new RegExp(
              "^" + name.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "$",
              "i",
            ),
          },
        });

        if (!playlist) {
          const err = createError(
            `Could not find a playlist named **${name}**.`,
          );
          return isInteraction ? message.editReply(err) : message.reply(err);
        }

        if (playlist.tracks.length === 0) {
          const err = createError(`Playlist **${playlist.name}** is empty!`);
          return isInteraction ? message.editReply(err) : message.reply(err);
        }

        const vc = message.member.voice.channel;
        if (!vc) {
          const err = createError("You need to be in a voice channel first.");
          return isInteraction ? message.editReply(err) : message.reply(err);
        }

        let player = client.manager.players.get(guildId);
        if (player && player.voiceId !== vc.id) {
          const err = createError(
            "I'm already playing in another voice channel.",
          );
          return isInteraction ? message.editReply(err) : message.reply(err);
        }

        if (!player) {
          player = await client.manager.createPlayer({
            guildId: guildId,
            voiceId: vc.id,
            textId: message.channel.id,
            deaf: true,
          });
        }

        // Add all tracks to queue
        let addedCount = 0;
        for (const trackData of playlist.tracks) {
          try {
            let result = await client.manager.search(trackData.uri, {
              requester: user,
            });
            if (!result || !result.tracks || result.tracks.length === 0) {
              const searchQuery = `${trackData.title} ${trackData.author}`;
              result = await client.manager.search(searchQuery, {
                requester: user,
              });
            }

            if (result && result.tracks && result.tracks.length > 0) {
              const track = result.tracks[0];
              track.title = metadata.cleanTitle(track.title);
              track.author = metadata.cleanAuthor(track.author);
              player.queue.add(track);
              addedCount++;
            }
          } catch (err) {
            logger.error(
              `Failed to resolve custom playlist track "${trackData.title}": ${err.message}`,
            );
          }
        }

        if (addedCount > 0 && player.queue.length > 0) {
          if (!player.playing && !player.paused) await player.play();

          const res = createSuccess(
            "Playing Playlist",
            `Successfully loaded and queued **${addedCount}** tracks from custom playlist **${playlist.name}**.`,
          );
          return isInteraction ? message.editReply(res) : message.reply(res);
        } else {
          const err = createError(
            "Could not resolve any tracks in this playlist for playback.",
          );
          return isInteraction ? message.editReply(err) : message.reply(err);
        }
      }
    }
  },
};
