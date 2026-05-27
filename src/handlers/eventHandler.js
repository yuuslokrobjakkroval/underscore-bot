const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

module.exports = (client) => {
  // Client Events
  const clientEventFiles = fs
    .readdirSync(path.join(__dirname, "../events/client"))
    .filter((file) => file.endsWith(".js"));
  for (const file of clientEventFiles) {
    const event = require(`../events/client/${file}`);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(client, ...args));
    } else {
      client.on(event.name, (...args) => event.execute(client, ...args));
    }
  }

  // Guild Events
  const guildEventFiles = fs
    .readdirSync(path.join(__dirname, "../events/guild"))
    .filter((file) => file.endsWith(".js"));
  for (const file of guildEventFiles) {
    const event = require(`../events/guild/${file}`);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(client, ...args));
    } else {
      client.on(event.name, (...args) => event.execute(client, ...args));
    }
  }

  // Player (Manager) Events
  const playerEventFiles = fs
    .readdirSync(path.join(__dirname, "../events/player"))
    .filter((file) => file.endsWith(".js"));
  for (const file of playerEventFiles) {
    const event = require(`../events/player/${file}`);
    client.manager.on(event.name, (...args) => event.execute(client, ...args));
  }

  logger.info(`Loaded client, guild, and player events.`);
};
