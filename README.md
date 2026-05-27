# Pookie Bot

A Discord music bot built with Discord.js v14, Kazagumo, Shoukaku, Lavalink, MongoDB, and Spotify support.

## Features

- Music playback through Lavalink
- Slash commands and prefix commands
- YouTube Music search support
- Spotify link/search support through Kazagumo Spotify
- Queue controls with Discord Components V2
- Autoplay recommendations
- 24/7 voice-channel mode
- Audio filters such as bassboost, 8D, nightcore, and vaporwave
- User favorites, history, custom playlists, and profiles
- Premium, no-prefix, and developer-only commands
- MongoDB-backed guild and user data

## Requirements

- Node.js 18 or newer
- A Discord bot application
- A Lavalink v4 node
- A MongoDB database
- Spotify developer credentials, if Spotify support is enabled

## Installation

```bash
npm install
```

Create a `.env` file in the project root:

```env
# Discord
TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_id
GUILD_ID=your_test_guild_id
OWNER_ID=your_discord_user_id
PREFIX=.

# Multi-bot family coordination
MUSIC_BOT_IDS=bot_id_1,bot_id_2,bot_id_3,bot_id_4,bot_id_5,bot_id_6

# Lavalink
LAVALINK_NAME=pookie
LAVALINK_HOST=localhost
LAVALINK_PORT=2333
LAVALINK_PASSWORD=your_lavalink_password
LAVALINK_SECURE=false

# Spotify
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Database
MONGO_URI=your_mongodb_connection_string

# Optional channels
LOG_CHANNEL_ID=your_log_channel_id
ERROR_CHANNEL_ID=your_error_channel_id
```

Do not commit your real `.env` file or real service credentials.

## Running

Start the bot:

```bash
npm start
```

Slash commands are currently auto-deployed when the bot starts. You can also deploy them manually with:

```bash
node src/scripts/deploy-commands.js
```

If `GUILD_ID` is set, commands are deployed to that guild. If it is not set, commands are deployed globally.

## Commands

### Music

- `play` / `p` - Play a song or playlist
- `search` - Search and choose a song
- `pause` - Pause playback
- `resume` - Resume playback
- `skip` - Skip the current song
- `voteskip` - Vote to skip
- `stop` - Stop playback and clear the queue
- `queue` / `q` - Show the current queue
- `nowplaying` - Show the current track
- `join` - Join your voice channel
- `leave` - Leave the voice channel
- `clear` - Clear the queue
- `shuffle` - Shuffle the queue
- `remove` - Remove a queued track
- `move` - Move a track in the queue
- `loop` - Toggle track or queue loop mode
- `replay` - Restart the current track
- `volume` - Change playback volume
- `autoplay` - Toggle autoplay
- `247` - Toggle 24/7 mode
- `recommend` - Recommend songs from the current track
- `similar` - Show similar tracks
- `lyrics` - Show lyrics
- `like` - Save the current song to favorites
- `dislike` - Remove a song from favorites
- `favorites` - Show favorite songs
- `history` - Show recent plays
- `playliked` - Play liked songs
- `playlist` - Manage custom playlists
- `playlofi` - Play a lo-fi stream

### Filters

- `bassboost`
- `8d`
- `nightcore`
- `vaporwave`
- `resetfilters`

### Admin

- `dj` - Manage the DJ role system

### Utility

- `help` / `h` / `cmds` / `commands`
- `ping`
- `uptime`
- `stats`
- `nodes`
- `invite`
- `support`
- `devs`
- `profile`
- `premium`
- `noprefix`

### Developer

- `eval`
- `reload`
- `reboot`

Developer commands are restricted to IDs listed in `OWNER_ID`.

## Project Structure

```text
src/
  commands/       Command modules grouped by category
  config/         Bot, Lavalink, and Spotify config
  database/       MongoDB connection and Mongoose models
  events/         Discord, guild, and player events
  handlers/       Command and event loaders
  scripts/        Utility scripts
  structures/     Custom Discord client
  systems/        Autoplay and music systems
  ui/             Component-based Discord UI
  utils/          Shared helpers
```

## Notes

- `MessageContent` intent is required for prefix commands.
- Global slash command deployment can take time to appear in Discord.
- Lavalink must be online before music playback can work.
- The bot uses MongoDB for user history, playlists, guild settings, premium state, and profile data.
- If you run multiple copies with the same prefix, set `MUSIC_BOT_IDS` on every bot so only one bot handles prefix/no-prefix commands for a voice channel.

## Recommended Next Improvements

- Move slash-command deployment out of normal startup.
- Add shared permission helpers for voice, DJ, and requester checks.
- Add command cooldowns for heavy music/search commands.
- Fix corrupted text encoding in UI strings.
- Replace administrator invite permissions with the minimum required permissions.
