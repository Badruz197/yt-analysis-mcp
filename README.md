# yt-analysis-mcp

An MCP server that analyzes YouTube videos using Google's Gemini API. Pass in a YouTube URL to get summaries or ask questions about the video content.

## Features

- **Summarize videos** - Get brief, medium, or detailed summaries with timestamps
- **Ask questions** - Ask specific questions about video content
- **Direct URL support** - No video downloading required; Gemini analyzes YouTube URLs directly

## Installation

```bash
git clone https://github.com/yourusername/yt-analysis-mcp.git
cd yt-analysis-mcp
pnpm install
pnpm build
```

## Configuration

Set your Gemini API key:

```bash
export GEMINI_API_KEY=your-api-key
```

Get an API key from [Google AI Studio](https://aistudio.google.com/apikey).

## Usage

### Claude Code

```bash
claude mcp add -s user -e GEMINI_API_KEY=your-key yt-analysis -- node /path/to/yt-analysis-mcp/dist/index.js
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "yt-analysis": {
      "command": "node",
      "args": ["/path/to/yt-analysis-mcp/dist/index.js"],
      "env": {
        "GEMINI_API_KEY": "your-key"
      }
    }
  }
}
```

## Tools

### `summarize_video`

Summarize a YouTube video's content.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `youtube_url` | string | Yes | Full YouTube URL |
| `detail_level` | string | No | `brief`, `medium` (default), or `detailed` |

### `ask_about_video`

Ask a specific question about a YouTube video's content.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `youtube_url` | string | Yes | Full YouTube URL |
| `question` | string | Yes | Your question about the video |

## Supported URL Formats

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://youtube.com/shorts/VIDEO_ID`

## Development

```bash
# Run in development mode
pnpm dev

# Run tests
pnpm test

# Build
pnpm build
```

## License

MIT

## Playlist tools (optional Google sign-in)

`list_my_playlists`, `create_playlist`, `add_to_playlist` and `rename_playlist` manage your own playlists. They never delete anything. YouTube doesn't let apps read or change Watch Later.

One-time setup:

1. In Google Cloud Console, in the project where YouTube Data API v3 is enabled, configure the OAuth consent screen (External) and set its publishing status to **In production**. While it's in "Testing", Google expires refresh tokens after 7 days. As the only user you'll see an "unverified app" warning; continue past it.
2. Create an OAuth client ID of type **Desktop app**.
3. On your own computer: `YOUTUBE_OAUTH_CLIENT_ID=... YOUTUBE_OAUTH_CLIENT_SECRET=... npm run auth:youtube`, then sign in.
4. Store the client ID, client secret and the printed refresh token as `YOUTUBE_OAUTH_CLIENT_ID`, `YOUTUBE_OAUTH_CLIENT_SECRET` and `YOUTUBE_OAUTH_REFRESH_TOKEN` wherever the server runs (for cloud sessions, the environment's variables).

Quota: adding a video costs 50 of the default 10,000 daily units, so about 190 adds a day.
