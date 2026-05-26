const logger = require("../../utils/logger");

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    await client.db.connect();
    logger.info(`Logged in as ${client.user.tag}!`);
    client.user.setStatus("online");
    client.user.setActivity("PEACHY GANG", { type: 1 });
  },
};
