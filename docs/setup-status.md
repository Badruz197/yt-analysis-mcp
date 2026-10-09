# Setup status

Last updated: 9 October 2026.

## What this is for

A Gemini-backed YouTube MCP server (`youtube`) used to curate a YouTube library for learning AI automation. It covers building automations for my own companies and possibly selling them to corporates. The curated list is in [youtube-library-plan.md](youtube-library-plan.md).

## Done

- **Cloud sessions.** `.mcp.json` registers the server as `youtube`. It starts through `scripts/start-mcp.sh`, which builds `dist/` first if needed. A SessionStart hook pre-builds it.
- **Tools.**
  - Gemini: `summarize_video`, `ask_about_video` and `get_video_timestamps`.
  - YouTube Data API: `search_youtube_videos`.
  - OAuth playlist tools: `list_my_playlists`, `create_playlist`, `add_to_playlist` and `rename_playlist`. None of them delete anything.
  - `extract_screenshots` and `extract_frames` don't work in the cloud, because youtube.com is blocked and `yt-dlp` isn't installed.
- **Keys in the claude.ai "Default" environment.**
  - `GEMINI_API_KEY`, which is on the free tier: 20 requests per day per model.
  - `GEMINI_MODEL=gemini-3.7-flash`. `gemini-flash-latest` hit its daily cap.
  - `YOUTUBE_API_KEY`.
- **Google OAuth app.**
  - Project `youtube-data-api-key` (`gen-lang-client-0957494704`).
  - Desktop client "yt-analysis-mcp desktop", with one active secret.
  - Consent screen published (In production), branded "YouTube Library Tools".
  - Home page and privacy policy on jamanproperties.co.uk (`/youtube-tools/`, `/privacy.html`).
- **Routine "YouTube Inbox triage".**
  - Runs on the 1st and 15th of each month at 07:46 London time. The first run is 15 October 2026.
  - It triages new videos in the **Inbox** playlist (added in the last 15 days): one Gemini call each, 90 seconds apart, at most 15 per run.
  - It adds keepers to the curated playlists and schedules daily follow-ups for any leftovers, up to 5.
  - It never deletes anything.

## Left to do

1. **Sign in.** Run `npm run auth:youtube` on the Mac, with the real client ID and secret exported, and sign in as badruzj@gmail.com. The last attempt failed with `invalid_client` because placeholder text was passed instead of the client ID.
2. **Save the credentials.** Add `YOUTUBE_OAUTH_CLIENT_ID`, `YOUTUBE_OAUTH_CLIENT_SECRET` and `YOUTUBE_OAUTH_REFRESH_TOKEN` to the Default environment. The routine needs them.
3. **Create the playlists** from the plan, all private: Watch next, AI & Automation, Business & Investing, Health & Performance, plus an empty **Inbox**. Rename "AI" and "Business" to "Superseded – …".
4. **From then on,** save new videos to **Inbox**, not Watch Later. Apps can't read Watch Later. Delete the superseded playlists by hand when ready.

## Notes

- Running the full test suite calls Gemini and uses up the free quota. Run only the unit tests unless you actually need the integration tests.
- The server shows "API quota exceeded or rate limited" for any error whose message contains "rate" or "quota", so it can mislabel unrelated errors (`src/gemini-client.ts`).
- Cheaper video review, if it's ever needed: sample fewer frames at low resolution on Flash-Lite. Not built.
