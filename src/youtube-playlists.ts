import { google, type youtube_v3 } from "googleapis";

export const YOUTUBE_OAUTH_SCOPE = "https://www.googleapis.com/auth/youtube";

export class PlaylistAuthError extends Error {
  constructor() {
    super(
      "Managing playlists needs Google sign-in. Run `npm run auth:youtube` once on your own computer, " +
        "then set YOUTUBE_OAUTH_CLIENT_ID, YOUTUBE_OAUTH_CLIENT_SECRET and YOUTUBE_OAUTH_REFRESH_TOKEN."
    );
    this.name = "PlaylistAuthError";
  }
}

export interface PlaylistSummary {
  id: string;
  title: string;
  itemCount: number;
  privacy: string;
}

export interface AddVideosResult {
  added: string[];
  skipped: string[];
  failed: Array<{ videoId: string; error: string }>;
}

export function createOAuthClient(clientId: string, clientSecret: string, redirectUri?: string) {
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export class YouTubePlaylistClient {
  private youtube: youtube_v3.Youtube;

  constructor(clientId: string, clientSecret: string, refreshToken: string) {
    const auth = createOAuthClient(clientId, clientSecret);
    auth.setCredentials({ refresh_token: refreshToken });
    this.youtube = google.youtube({ version: "v3", auth });
  }

  static fromEnv(): YouTubePlaylistClient | null {
    const { YOUTUBE_OAUTH_CLIENT_ID, YOUTUBE_OAUTH_CLIENT_SECRET, YOUTUBE_OAUTH_REFRESH_TOKEN } =
      process.env;
    if (!YOUTUBE_OAUTH_CLIENT_ID || !YOUTUBE_OAUTH_CLIENT_SECRET || !YOUTUBE_OAUTH_REFRESH_TOKEN) {
      return null;
    }
    return new YouTubePlaylistClient(
      YOUTUBE_OAUTH_CLIENT_ID,
      YOUTUBE_OAUTH_CLIENT_SECRET,
      YOUTUBE_OAUTH_REFRESH_TOKEN
    );
  }

  async listPlaylists(): Promise<PlaylistSummary[]> {
    const playlists: PlaylistSummary[] = [];
    let pageToken: string | undefined;
    do {
      const res = await this.youtube.playlists.list({
        part: ["snippet", "contentDetails", "status"],
        mine: true,
        maxResults: 50,
        pageToken,
      });
      for (const p of res.data.items ?? []) {
        playlists.push({
          id: p.id ?? "",
          title: p.snippet?.title ?? "",
          itemCount: p.contentDetails?.itemCount ?? 0,
          privacy: p.status?.privacyStatus ?? "",
        });
      }
      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);
    return playlists;
  }

  async createPlaylist(
    title: string,
    description: string,
    privacy: "private" | "unlisted" | "public"
  ): Promise<PlaylistSummary> {
    const res = await this.youtube.playlists.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: { title, description },
        status: { privacyStatus: privacy },
      },
    });
    return { id: res.data.id ?? "", title, itemCount: 0, privacy };
  }

  async renamePlaylist(playlistId: string, title: string): Promise<void> {
    // playlists.update replaces the whole snippet, so keep the existing description.
    const current = await this.youtube.playlists.list({ part: ["snippet"], id: [playlistId] });
    const snippet = current.data.items?.[0]?.snippet;
    if (!snippet) {
      throw new Error(`Playlist not found or not yours: ${playlistId}`);
    }
    await this.youtube.playlists.update({
      part: ["snippet"],
      requestBody: {
        id: playlistId,
        snippet: { title, description: snippet.description ?? "" },
      },
    });
  }

  private async playlistVideoIds(playlistId: string): Promise<Set<string>> {
    const ids = new Set<string>();
    let pageToken: string | undefined;
    do {
      const res = await this.youtube.playlistItems.list({
        part: ["contentDetails"],
        playlistId,
        maxResults: 50,
        pageToken,
      });
      for (const item of res.data.items ?? []) {
        if (item.contentDetails?.videoId) ids.add(item.contentDetails.videoId);
      }
      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);
    return ids;
  }

  // Adds in order, skipping videos already in the playlist so re-running is safe.
  async addVideos(playlistId: string, videoIds: string[]): Promise<AddVideosResult> {
    const existing = await this.playlistVideoIds(playlistId);
    const result: AddVideosResult = { added: [], skipped: [], failed: [] };
    for (const videoId of videoIds) {
      if (existing.has(videoId)) {
        result.skipped.push(videoId);
        continue;
      }
      try {
        await this.youtube.playlistItems.insert({
          part: ["snippet"],
          requestBody: {
            snippet: { playlistId, resourceId: { kind: "youtube#video", videoId } },
          },
        });
        existing.add(videoId);
        result.added.push(videoId);
      } catch (error) {
        result.failed.push({
          videoId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return result;
  }
}
