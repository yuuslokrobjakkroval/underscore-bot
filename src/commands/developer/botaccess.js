const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");
const emojis = require("../../utils/emojis");
const {
  addOwner,
  isOwner,
  removeOwner,
  setMode,
  syncClientAccess,
} = require("../../utils/botAccess");
const { getBotId } = require("../../utils/entitlements");

const createMsg = (text, isError = false) => ({
  components: [
    new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${isError ? `> ${emojis.error} ` : "> "}${text}`,
        ),
      )
      .toJSON(),
  ],
  flags: MessageFlags.IsComponentsV2,
});

const cleanUserId = (value) => value?.replace(/[<@!>]/g, "");

module.exports = {
  name: "botaccess",
  aliases: ["botmode", "botprivacy", "owners"],
  description: "Manage bot public/private access and bot owners.",
  data: new SlashCommandBuilder()
    .setName("botaccess")
    .setDescription("Manage bot access")
    .addSubcommand((sub) =>
      sub.setName("status").setDescription("Show current bot access settings"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("setmode")
        .setDescription("Set the bot to public or private")
        .addStringOption((opt) =>
          opt
            .setName("mode")
            .setDescription("Private allows only owners. Public allows everyone.")
            .setRequired(true)
            .addChoices(
              { name: "Public", value: "public" },
              { name: "Private", value: "private" },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("addowner")
        .setDescription("Add a bot owner")
        .addUserOption((opt) =>
          opt
            .setName("user")
            .setDescription("The user to add as bot owner")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("removeowner")
        .setDescription("Remove a bot owner")
        .addUserOption((opt) =>
          opt
            .setName("user")
            .setDescription("The user to remove from bot owners")
            .setRequired(true),
        ),
    ),

  async execute(client, message, args = []) {
    await syncClientAccess(client);

    const isInteraction = !!message.options;
    const user = isInteraction ? message.user : message.author;

    if (!isOwner(client, user.id)) {
      return createMsg("This command is restricted to Bot Owners.", true);
    }

    let sub = isInteraction
      ? message.options.getSubcommand()
      : (args[0] || "status").toLowerCase();

    if (sub === "public" || sub === "private") {
      args.unshift("setmode");
      sub = "setmode";
    }

    if (sub === "status") {
      const mode = client.config.botMode || "public";
      const owners = client.config.owners.length
        ? client.config.owners.map((id) => `<@${id}>`).join("\n")
        : "`None`";

      return createMsg(
        `**Bot Access Status**\n` +
          `**Bot:** <@${getBotId(client)}>\n` +
          `**Mode:** \`${mode}\`\n` +
          `**Owners:**\n${owners}`,
      );
    }

    if (sub === "setmode") {
      const mode = isInteraction
        ? message.options.getString("mode")
        : args[1]?.toLowerCase();

      if (!["public", "private"].includes(mode)) {
        return createMsg(
          `Invalid mode. Use \`${client.config.prefix}botaccess public\` or \`${client.config.prefix}botaccess private\`.`,
          true,
        );
      }

      await setMode(client, mode);
      return createMsg(
        mode === "private"
          ? `**Private mode enabled** for <@${getBotId(client)}>. Only this bot's owners can use commands now.`
          : `**Public mode enabled** for <@${getBotId(client)}>. Everyone can use this bot now.`,
      );
    }

    if (sub === "addowner") {
      const targetUser = isInteraction
        ? message.options.getUser("user")
        : message.mentions.users.first();
      const targetId = isInteraction
        ? targetUser.id
        : cleanUserId(targetUser?.id || args[1]);

      if (!targetId) {
        return createMsg("Please mention a user or provide a user ID.", true);
      }

      await addOwner(client, targetId);
      const display = targetUser || (await client.users.fetch(targetId).catch(() => null));

      return createMsg(
        `Added **${display?.username || targetId}** as a bot owner.`,
      );
    }

    if (sub === "removeowner") {
      const targetUser = isInteraction
        ? message.options.getUser("user")
        : message.mentions.users.first();
      const targetId = isInteraction
        ? targetUser.id
        : cleanUserId(targetUser?.id || args[1]);

      if (!targetId) {
        return createMsg("Please mention a user or provide a user ID.", true);
      }

      let result;
      try {
        result = await removeOwner(client, targetId);
      } catch (error) {
        return createMsg(error.message, true);
      }

      if (!result.removed) {
        return createMsg("That user is not currently a bot owner.", true);
      }

      const display = targetUser || (await client.users.fetch(targetId).catch(() => null));
      return createMsg(
        `Removed **${display?.username || targetId}** from bot owners.`,
      );
    }

    return createMsg(
      `Invalid subcommand. Use \`${client.config.prefix}botaccess status\`, \`public\`, \`private\`, \`addowner\`, or \`removeowner\`.`,
      true,
    );
  },
};
