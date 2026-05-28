const logger = require("../../utils/logger");
const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");
const emojis = require("../../utils/emojis");

const createErrorMsg = (text) => ({
  content: null,
  embeds: [],
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

module.exports = {
  name: "interactionCreate",
  async execute(client, interaction) {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      // Premium Check
      if (command.premium) {
        const Guild = require("../../database/models/guild");
        const User = require("../../database/models/user");
        const guildData = await Guild.findOne({ guildId: interaction.guildId });
        const userData = await User.findOne({ userId: interaction.user.id });
        const isOwner = client.config.owners.includes(interaction.user.id);

        const isGuildPremium =
          guildData?.premium &&
          (!guildData.premiumUntil || guildData.premiumUntil > Date.now());
        const isUserPremium =
          (userData?.premium &&
            (!userData.premiumUntil || userData.premiumUntil > Date.now())) ||
          isOwner;

        if (!isGuildPremium && !isUserPremium) {
          return interaction.reply({
            components: [
              new ContainerBuilder()
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    `### ✨ Premium Feature\n> This command is restricted to **Premium Users** or **Premium Guilds**.\n> Use \`/premium status\` to check your status.`,
                  ),
                )
                .toJSON(),
            ],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true,
          });
        }
      }

      try {
        const response = await command.execute(client, interaction);
        if (response && typeof response === "object" && !response.id) {
          if (interaction.deferred || interaction.replied) {
            await interaction.editReply(response).catch(() => {});
          } else {
            await interaction.reply(response).catch(() => {});
          }
        }
      } catch (error) {
        logger.error(`### 💀 Command Error: ${error.stack}`);
        if (interaction.deferred || interaction.replied) {
          await interaction
            .editReply({
              content: "There was an error while executing this command!",
            })
            .catch(() => {});
        } else {
          await interaction
            .reply({
              content: "There was an error while executing this command!",
              ephemeral: true,
            })
            .catch(() => {});
        }
      }
    } else if (interaction.isButton() || interaction.isStringSelectMenu()) {
      try {
        // Handle help interactions first (don't need player)
        const helpUI = require("../../ui/helpUI");

        // Handle Select Menu
        if (
          interaction.isStringSelectMenu() &&
          interaction.customId === "help_menu"
        ) {
          const value = interaction.values[0];
          const categoryMap = {
            help_main: "mainHelp",
            help_music: "musicHelp",
            help_social: "socialHelp",
            help_admin: "adminHelp",
            help_utility: "utilityHelp",
          };
          const method = categoryMap[value];
          if (method) return interaction.update(await helpUI[method](client));
        }

        // Handle Buttons
        if (interaction.isButton()) {
          const buttonMap = {
            help_initial: "mainHelp",
            help_main: "mainHelp",
            help_music: "musicHelp",
            help_utility: "utilityHelp",
            help_social: "socialHelp",
            help_admin: "adminHelp",
          };
          const method = buttonMap[interaction.customId];
          if (method) {
            return interaction.update(await helpUI[method](client));
          }

          // Guild List Pagination
          if (interaction.customId.startsWith("guildlist_")) {
            const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
            const guilds = Array.from(client.guilds.cache.values());
            const guildsPerPage = 10;
            const totalPages = Math.ceil(guilds.length / guildsPerPage);

            let page = interaction.customId.includes("next")
              ? parseInt(interaction.customId.split("_")[2]) + 1
              : parseInt(interaction.customId.split("_")[2]) - 1;

            if (page < 1 || page > totalPages)
              page = interaction.customId.includes("next") ? totalPages : 1;

            const start = (page - 1) * guildsPerPage;
            const end = start + guildsPerPage;
            const pageGuilds = guilds.slice(start, end);

            const embed = new EmbedBuilder()
              .setTitle("🏢 Guild List")
              .setColor("#5865F2")
              .setFooter({
                text: `Page ${page}/${totalPages} • Total: ${guilds.length} guilds`,
              });

            pageGuilds.forEach((g, idx) => {
              const createdAt = Math.floor(g.createdTimestamp / 1000);
              embed.addFields({
                name: `${start + idx + 1}. ${g.name}`,
                value:
                  `ID: \`${g.id}\`\n` +
                  `Members: \`${g.memberCount}\`\n` +
                  `Owner: \`${g.ownerId}\`\n` +
                  `Created: <t:${createdAt}:R>`,
                inline: false,
              });
            });

            const buttons = new ActionRowBuilder();
            if (page > 1) {
              buttons.addComponents(
                new ButtonBuilder()
                  .setCustomId(`guildlist_prev_${page}`)
                  .setLabel("◀ Previous")
                  .setStyle(ButtonStyle.Primary),
              );
            }

            buttons.addComponents(
              new ButtonBuilder()
                .setCustomId("guildlist_dummy")
                .setLabel(`${page}/${totalPages}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            );

            if (page < totalPages) {
              buttons.addComponents(
                new ButtonBuilder()
                  .setCustomId(`guildlist_next_${page}`)
                  .setLabel("Next ▶")
                  .setStyle(ButtonStyle.Primary),
              );
            }

            return interaction.update({
              embeds: [embed],
              components: [buttons],
            });
          }

          // Guild Leave Confirmation
          if (interaction.customId.startsWith("guildleave_")) {
            if (interaction.customId === "guildleave_cancel") {
              return interaction.update({
                content: "✅ Guild leave cancelled.",
                components: [],
              });
            }

            if (interaction.customId.startsWith("guildleave_confirm_")) {
              const guildId = interaction.customId.replace(
                "guildleave_confirm_",
                "",
              );
              const targetGuild = client.guilds.cache.get(guildId);

              if (!targetGuild) {
                return interaction.update({
                  content: "❌ Guild not found.",
                  components: [],
                });
              }

              await targetGuild.leave();
              return interaction.update({
                content: `✅ Successfully left guild: **${targetGuild.name}**`,
                components: [],
              });
            }
          }
        }
      } catch (error) {
        logger.error(error);
        return interaction
          .reply(
            createErrorMsg(
              `**Interaction Error**\n\`\`\`js\n${error.message}\n\`\`\``,
            ),
          )
          .catch(() => {});
      }

      const player = client.manager.players.get(interaction.guildId);
      if (!player) return;

      // 1. Validate user in VC
      const vc = interaction.member.voice.channel;
      if (!vc || vc.id !== player.voiceId) {
        return interaction.reply({
          content:
            "You must be in the same voice channel as the bot to use these controls!",
          ephemeral: true,
        });
      }

      // 2. Check permissions (DJ/Admin/Requester)
      // Removed Guild model check as guild.js was deleted
      const isDJ =
        interaction.member.permissions.has("Administrator") ||
        player.queue.current?.requester?.id === interaction.user.id;

      if (!isDJ && !["skip"].includes(interaction.customId)) {
        return interaction.reply(
          createErrorMsg(
            "This action is restricted to Administrators or the Song Requester.",
          ),
        );
      }

      const createSuccessMsg = (text) => ({
        content: null,
        embeds: [],
        components: [
          new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`> ${emojis.check} ${text}`),
            )
            .toJSON(),
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      // 3. Execute action
      let actionText = "";
      switch (interaction.customId) {
        case "play_pause":
          player.pause(!player.paused);
          actionText = player.paused
            ? "Paused the music."
            : "Resumed the music.";
          break;
        case "previous":
          if (player.queue.previous) {
            player.queue.add(player.queue.previous, 0);
            player.skip();
            actionText = "Playing previous track.";
          } else {
            return interaction.reply(
              createErrorMsg("No previous track found."),
            );
          }
          break;
        case "skip":
          if (isDJ) {
            player.skip();
            actionText = "Skipped the current track.";
          } else {
            let votes = player.data.votes || [];
            if (votes.includes(interaction.user.id))
              return interaction.reply({
                content: "Already voted!",
                ephemeral: true,
              });
            votes.push(interaction.user.id);
            player.data.votes = votes;
            const required = Math.ceil(
              vc.members.filter((m) => !m.user.bot).size / 2,
            );
            if (votes.length >= required) {
              player.skip();
              player.data.votes = [];
              actionText = "Skipped the track (Vote passed).";
            } else {
              return interaction.reply(
                createSuccessMsg(
                  `Vote added: ${votes.length}/${required} needed to skip.`,
                ),
              );
            }
          }
          break;
        case "stop":
          player.destroy();
          actionText = "Stopped the player and cleared the queue.";
          break;
        case "loop":
          const modes = { none: "track", track: "queue", queue: "none" };
          player.setLoop(modes[player.loop] || "none");
          actionText = `Loop mode set to: \` ${player.loop.toUpperCase()} \``;
          break;
      }

      // Handle remove/playnext from addedUI
      if (interaction.customId.startsWith("remove_")) {
        const id = interaction.customId.replace("remove_", "");
        const index = player.queue.findIndex((t) => t.identifier === id);
        if (index !== -1) {
          const track = player.queue[index];
          player.queue.splice(index, 1);
          actionText = `Removed **${track.title}** from queue.`;
        } else {
          return interaction.reply(createErrorMsg("Track not found in queue."));
        }
      }

      if (interaction.customId.startsWith("playnext_")) {
        const id = interaction.customId.replace("playnext_", "");
        const index = player.queue.findIndex((t) => t.identifier === id);
        if (index !== -1) {
          const track = player.queue[index];
          player.queue.splice(index, 1);
          player.queue.unshift(track);
          actionText = `Moved **${track.title}** to play next.`;
        } else {
          return interaction.reply(createErrorMsg("Track not found in queue."));
        }
      }

      // Send success message if any action was taken
      if (actionText) {
        if (!interaction.deferred && !interaction.replied) {
          await interaction.reply(createSuccessMsg(actionText));
        }
      }

      // 4. Update UI instantly for toggles (don't update for skip/stop/previous as they trigger events)
      if (["play_pause", "loop"].includes(interaction.customId)) {
        const playerUI = require("../../ui/playerUI");
        const updatedUI = playerUI.createPlayerEmbed(player);
        if (updatedUI) {
          const message = player.data.message;
          if (message && message.editable) {
            await message.edit(updatedUI).catch((err) => {
              logger.error(
                `### ${emojis.error} Failed to edit player message: ${err.message}`,
              );
            });
          }
        }
      }
    }
  },
};
