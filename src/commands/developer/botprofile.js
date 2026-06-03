const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");
const emojis = require("../../utils/emojis");
const { isOwner, syncClientAccess } = require("../../utils/botAccess");

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

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

const getInvokedName = (client, message) => {
  const content = message.content || "";
  const mention = new RegExp(`^<@!?${client.user.id}>`).exec(content);

  if (mention) {
    return content
      .slice(mention[0].length)
      .trim()
      .split(/\s+/)[0]
      ?.toLowerCase();
  }

  if (content.startsWith(client.config.prefix)) {
    return content
      .slice(client.config.prefix.length)
      .trim()
      .split(/\s+/)[0]
      ?.toLowerCase();
  }

  return content.trim().split(/\s+/)[0]?.toLowerCase();
};

const inferPrefixSubcommand = (client, message, args = []) => {
  const invoked = getInvokedName(client, message);
  if (["botavatar", "setavatar", "avatarbot"].includes(invoked))
    return "avatar";
  if (["botbanner", "setbanner"].includes(invoked)) return "banner";
  if (["botusername", "setusername"].includes(invoked)) return "username";

  return args[0]?.toLowerCase();
};

const getPrefixImageUrl = (message, args = [], argIndex = 1) => {
  const attachment = message.attachments?.first();
  return attachment?.url || args[argIndex];
};

const getImageInput = (message, args = [], subcommand) => {
  const isInteraction = !!message.options;

  if (isInteraction) {
    const attachment = message.options.getAttachment("image");
    return {
      url: attachment?.url || message.options.getString("url"),
      name: attachment?.name,
      contentType: attachment?.contentType,
      size: attachment?.size,
    };
  }

  const isAlias =
    ["avatar", "banner"].includes(subcommand) &&
    !["avatar", "banner"].includes(args[0]?.toLowerCase());
  const url = getPrefixImageUrl(message, args, isAlias ? 0 : 1);
  const attachment = message.attachments?.first();

  return {
    url,
    name: attachment?.name,
    contentType: attachment?.contentType,
    size: attachment?.size,
  };
};

const resolveImageData = async (input) => {
  if (!input.url) {
    throw new Error("Please upload an image or provide a direct image URL.");
  }

  if (input.size && input.size > MAX_IMAGE_SIZE) {
    throw new Error("Image is too large. Please use an image under 8 MB.");
  }

  const response = await fetch(input.url);
  if (!response.ok) {
    throw new Error(`Could not download that image. HTTP ${response.status}.`);
  }

  const contentType = response.headers.get("content-type") || input.contentType;
  if (
    !contentType ||
    !IMAGE_TYPES.has(contentType.split(";")[0].toLowerCase())
  ) {
    throw new Error("Please use a PNG, JPG, GIF, or WebP image.");
  }

  const contentLength = Number(
    response.headers.get("content-length") || input.size || 0,
  );
  if (contentLength > MAX_IMAGE_SIZE) {
    throw new Error("Image is too large. Please use an image under 8 MB.");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_IMAGE_SIZE) {
    throw new Error("Image is too large. Please use an image under 8 MB.");
  }

  return `data:${contentType.split(";")[0]};base64,${buffer.toString("base64")}`;
};

module.exports = {
  name: "botprofile",
  aliases: [
    "botavatar",
    "setavatar",
    "avatarbot",
    "ca",
    "botbanner",
    "setbanner",
    "cb",
    "botusername",
    "setusername",
    "cu",
  ],
  description: "Change the bot username, avatar, or banner (Owner only).",
  data: new SlashCommandBuilder()
    .setName("botprofile")
    .setDescription("Change the bot profile settings (Owner only)")
    .addSubcommand((sub) =>
      sub
        .setName("avatar")
        .setDescription("Change the bot avatar")
        .addAttachmentOption((opt) =>
          opt
            .setName("image")
            .setDescription("Upload the new avatar image")
            .setRequired(false),
        )
        .addStringOption((opt) =>
          opt
            .setName("url")
            .setDescription("Direct URL to the new avatar image")
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("banner")
        .setDescription("Change the bot banner")
        .addAttachmentOption((opt) =>
          opt
            .setName("image")
            .setDescription("Upload the new banner image")
            .setRequired(false),
        )
        .addStringOption((opt) =>
          opt
            .setName("url")
            .setDescription("Direct URL to the new banner image")
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("username")
        .setDescription("Change the bot username")
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("The new bot username")
            .setMinLength(2)
            .setMaxLength(32)
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

    const sub = isInteraction
      ? message.options.getSubcommand()
      : inferPrefixSubcommand(client, message, args);

    if (sub === "avatar") {
      try {
        if (isInteraction && !message.deferred && !message.replied) {
          await message.deferReply();
        }

        const imageData = await resolveImageData(
          getImageInput(message, args, sub),
        );
        await client.user.setAvatar(imageData);
        return createMsg("Bot avatar updated successfully.");
      } catch (error) {
        return createMsg(error.message, true);
      }
    }

    if (sub === "banner") {
      try {
        if (isInteraction && !message.deferred && !message.replied) {
          await message.deferReply();
        }

        const imageData = await resolveImageData(
          getImageInput(message, args, sub),
        );
        await client.rest.patch("/users/@me", { body: { banner: imageData } });
        return createMsg("Bot banner updated successfully.");
      } catch (error) {
        return createMsg(
          `${error.message} Discord may reject banner changes if this bot/application cannot use banners.`,
          true,
        );
      }
    }

    if (sub === "username") {
      const name = isInteraction
        ? message.options.getString("name")
        : args.slice(args[0]?.toLowerCase() === "username" ? 1 : 0).join(" ");

      if (!name || name.length < 2 || name.length > 32) {
        return createMsg(
          "Please provide a username between 2 and 32 characters.",
          true,
        );
      }

      try {
        await client.user.setUsername(name);
        return createMsg(`Bot username updated to **${name}**.`);
      } catch (error) {
        return createMsg(error.message, true);
      }
    }

    return createMsg(
      `Invalid usage. Use \`${client.config.prefix}botprofile avatar <image_url>\`, \`${client.config.prefix}botprofile banner <image_url>\`, or \`${client.config.prefix}botprofile username <name>\`. You can also upload an image attachment.`,
      true,
    );
  },
};
