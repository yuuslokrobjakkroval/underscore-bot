const logger = require("../../utils/logger");
const { syncClientAccess } = require("../../utils/botAccess");

const updateActivity = (client) => {
  const activePlayers = Array.from(client.manager.players.values()).filter(
    (p) => p.playing || p.paused,
  );

  if (activePlayers.length === 0) {
    client.user.setActivity("PEACHY GANG", { type: 1 });
    return;
  }

  const totalQueued = activePlayers.reduce((sum, p) => sum + p.queue.length, 0);
  const nowPlaying = activePlayers[0].current;

  if (nowPlaying) {
    client.user.setActivity(`${nowPlaying.title}`, { type: 0 });
  } else if (totalQueued > 0) {
    client.user.setActivity(
      `${totalQueued} track${totalQueued === 1 ? "" : "s"} queued`,
      { type: 2 },
    );
  } else {
    client.user.setActivity("PEACHY GANG", { type: 1 });
  }
};

module.exports = {
  name: "clientReady",
  once: true,
  async execute(client) {
    await client.db.connect();
    await syncClientAccess(client);
    logger.info(`Logged in as ${client.user.tag}!`);
    client.user.setStatus("online");

    updateActivity(client);
    client.updateActivity = updateActivity;

    setInterval(() => updateActivity(client), 30000);
  },
};
