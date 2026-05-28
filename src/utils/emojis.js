/**
 * Centralized emoji registry for Feather Bot.
 * All Discord custom emojis are defined here — edit IDs in one place.
 */
const emojis = {
  // ── Player Controls ──────────────────────────────────────────────────────
  backward: "<:previousstrokerounded:1509086512317337781>",
  play: "<:playstrokerounded:1509086493396963479>",
  pause: "<:pausestrokerounded:1509086496265605330>",
  stop: "<:stopstrokerounded:1509086501601021952>",
  forward: "<:nextstrokerounded:1509086514741510195>",
  loop: "<:repeatstrokerounded:1509086526221324428>",
  shuffle: "<:shufflesquarestrokerounded:1509086516960301056>",
  volume: "<:volumehighstrokerounded:1509086519241998487>",
  vinyl: "<:vynil01strokerounded:1509086523935559772>", // animated spinning vinyl

  // ── Status / Feedback ────────────────────────────────────────────────────
  check: "<:checkstrokerounded:1509089548129275924>",
  error: "<:cancel01strokerounded:1509092366718603405>",
  blacklist: "<:listxstrokerounded:1509089544220315719>",
  delete: "<:delete02strokerounded:1509089541955387575>",

  // ── Branding / Navigation ────────────────────────────────────────────────
  feather: "<a:peachy:1459255820431921387>",
  music: "<:music3strokerounded:1509089551782772797>",
  navigation: "<:globestrokerounded:1509089539694530731>",
  search: "<:search02strokerounded:1509089561291128943>",
  lyrics: "<:bookopentextstrokerounded:1509089558761963540>",

  // ── Admin / Config ───────────────────────────────────────────────────────
  admin: "<:managerstrokerounded:1509091073161691287>",
  config: "<:settings01strokerounded:1509091076038856765>",

  // ── Stats (three distinct emoji IDs) ────────────────────────────────────
  statsDev: "<:developerstrokerounded:1509091078593056830>", // developer tier badge in /profile
  statsBot: "<:botstrokerounded:1509091080828747938>", // bot info header in /stats
  statsSec: "<:batterycharging01strokerounded:1509091082875699291>", // statistics section header in /stats

  // ── Social / Profile ─────────────────────────────────────────────────────
  heart: "<:heartstrokerounded:1509091084960268410>",
  file: "<:file01strokerounded:1509091087388770324>",
  agHeart: "<:heartpulsestrokerounded:1509091090354147448>",
  hpBar: "<:analytics01strokerounded:1509091092677787659>",
  musicAnim: "<:audiobook02strokerounded:1509091094938259517>", // animated music note (different from static)
  nowPlaying: "<a:MOONPHASES:1506322683355467806>",
  vibe: "<:viberstrokerounded:1509091114974445618>",

  // ── Animated / Effects ───────────────────────────────────────────────────
  thunder: "<:jupiterstrokerounded:1509091116996235314>",
  blackdot: "<:dotstrokerounded:1509091119533785098>",
  rebooting: "<:startup01strokerounded:1509091070670274730>", // animated loop used in reboot text

  // ── Ranks ────────────────────────────────────────────────────────────────
  rank: {
    bronze: "<:BRONZE:1509056843190636634>",
    silver: "<:SILVER:1509056845258424372>",
    gold: "<:GOLD:1509056847770812588>",
    diamond: "<:DIAMOND:1509056838686085250>",
    platinum: "<:PLATINUM:1509056850174279792>",
    champion: "<:CHAMPION:1509056840745484450>",
  },
};

module.exports = emojis;
