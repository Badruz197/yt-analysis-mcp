import { google } from "googleapis";
import { extractVideoId } from "./validators.js";

export interface VideoMetadata {
  title: string;
  channelTitle: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
}

export interface VideoSearchResult {
  videoId: string;
  url: string;
  title: string;
  channelTitle: string;
  description: string;
  publishedAt: string;
}

export class YouTubeMetadataClient {
  private youtube;

  constructor(apiKey: string) {
    this.youtube = google.youtube({
      version: "v3",
      auth: apiKey,
    });
  }

  async getMetadata(youtubeUrl: string): Promise<VideoMetadata> {
    try {
      const videoId = extractVideoId(youtubeUrl);

      const response = await this.youtube.videos.list({
        part: ["snippet"],
        id: [videoId],
      });

      const video = response.data.items?.[0];
      if (!video?.snippet) {
        throw new Error(`No metadata found for video: ${videoId}`);
      }

      const snippet = video.snippet;

      return {
        title: snippet.title || "Unknown",
        channelTitle: snippet.channelTitle || "Unknown",
        description: snippet.description || "",
        publishedAt: snippet.publishedAt || "",
        thumbnailUrl:
          snippet.thumbnails?.high?.url ||
          snippet.thumbnails?.default?.url ||
          "",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch YouTube metadata: ${message}`);
    }
  }

  async search(
    query: string,
    maxResults: number = 10,
    order: "relevance" | "date" | "viewCount" | "rating" = "relevance"
  ): Promise<VideoSearchResult[]> {
    try {
      const response = await this.youtube.search.list({
        part: ["snippet"],
        q: query,
        type: ["video"],
        maxResults,
        order,
      });

      const items = response.data.items || [];

      return items
        .filter((item) => item.id?.videoId)
        .map((item) => {
          const videoId = item.id!.videoId!;
          const snippet = item.snippet;
          return {
            videoId,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            title: snippet?.title || "Unknown",
            channelTitle: snippet?.channelTitle || "Unknown",
            description: snippet?.description || "",
            publishedAt: snippet?.publishedAt || "",
          };
        });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to search YouTube: ${message}`);
    }
  }
}
