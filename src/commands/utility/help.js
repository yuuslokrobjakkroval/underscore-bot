const { SlashCommandBuilder } = require("discord.js");
const helpUI = require("../../ui/helpUI");

module.exports = {
  name: "help",
  aliases: ["h", "cmds", "commands"],
  description: "Display the help menu",
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Display the help menu"),
  async execute(client, message, args) {
    const helpData = await helpUI.mainHelp(client);
    return message.reply(helpData);
  },
};
