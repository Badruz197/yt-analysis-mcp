import { describe, it, expect, vi, afterEach } from "vitest";
import { YouTubePlaylistClient } from "../src/youtube-playlists.js";
import {
  AddToPlaylistInputSchema,
  CreatePlaylistInputSchema,
  RenamePlaylistInputSchema,
} from "../src/validators.js";

function clientWithFakeApi(existing: string[], failOn: string[] = []) {
  const client = new YouTubePlaylistClient("id", "secret", "refresh");
  const insert = vi.fn(async ({ requestBody }: any) => {
    const videoId = requestBody.snippet.resourceId.videoId;
    if (failOn.includes(videoId)) throw new Error("videoNotFound");
    return { data: {} };
  });
  (client as any).youtube = {
    playlistItems: {
      list: vi.fn(async () => ({
        data: { items: existing.map((videoId) => ({ contentDetails: { videoId } })) },
      })),
      insert,
    },
  };
  return { client, insert };
}

describe("YouTubePlaylistClient.fromEnv", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("returns null when any OAuth variable is missing", () => {
    vi.stubEnv("YOUTUBE_OAUTH_CLIENT_ID", "id");
    vi.stubEnv("YOUTUBE_OAUTH_CLIENT_SECRET", "secret");
    vi.stubEnv("YOUTUBE_OAUTH_REFRESH_TOKEN", "");
    expect(YouTubePlaylistClient.fromEnv()).toBeNull();
  });

  it("builds a client when all OAuth variables are set", () => {
    vi.stubEnv("YOUTUBE_OAUTH_CLIENT_ID", "id");
    vi.stubEnv("YOUTUBE_OAUTH_CLIENT_SECRET", "secret");
    vi.stubEnv("YOUTUBE_OAUTH_REFRESH_TOKEN", "refresh");
    expect(YouTubePlaylistClient.fromEnv()).toBeInstanceOf(YouTubePlaylistClient);
  });
});

describe("YouTubePlaylistClient.addVideos", () => {
  it("skips videos already in the playlist and duplicates in the input", async () => {
    const { client, insert } = clientWithFakeApi(["aaaaaaaaaaa"]);
    const result = await client.addVideos("PL1", ["aaaaaaaaaaa", "bbbbbbbbbbb", "bbbbbbbbbbb"]);
    expect(result.added).toEqual(["bbbbbbbbbbb"]);
    expect(result.skipped).toEqual(["aaaaaaaaaaa", "bbbbbbbbbbb"]);
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("keeps going after a failed insert and reports it", async () => {
    const { client } = clientWithFakeApi([], ["bbbbbbbbbbb"]);
    const result = await client.addVideos("PL1", ["aaaaaaaaaaa", "bbbbbbbbbbb", "ccccccccccc"]);
    expect(result.added).toEqual(["aaaaaaaaaaa", "ccccccccccc"]);
    expect(result.failed).toEqual([{ videoId: "bbbbbbbbbbb", error: "videoNotFound" }]);
  });
});

describe("playlist input schemas", () => {
  it("accepts video IDs and URLs, normalising URLs to IDs", () => {
    const input = AddToPlaylistInputSchema.parse({
      playlist_id: "PL1",
      videos: ["jNQXAC9IVRw", "https://www.youtube.com/watch?v=ysPbXH0LpIE", "https://youtu.be/XSZP9GhhuAc"],
    });
    expect(input.videos).toEqual(["jNQXAC9IVRw", "ysPbXH0LpIE", "XSZP9GhhuAc"]);
  });

  it("rejects things that are not videos", () => {
    expect(() =>
      AddToPlaylistInputSchema.parse({ playlist_id: "PL1", videos: ["not a video"] })
    ).toThrow();
  });

  it("defaults new playlists to private with an empty description", () => {
    expect(CreatePlaylistInputSchema.parse({ title: "Watch next" })).toEqual({
      title: "Watch next",
      description: "",
      privacy: "private",
    });
  });

  it("rejects an empty rename", () => {
    expect(() => RenamePlaylistInputSchema.parse({ playlist_id: "PL1", title: "  " })).toThrow();
  });
});
