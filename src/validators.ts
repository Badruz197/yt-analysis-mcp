import { z } from "zod";

const YOUTUBE_URL_REGEX =
  /^https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)[\w-]+/;

export const YouTubeUrlSchema = z
  .string()
  .trim()
  .refine((url) => YOUTUBE_URL_REGEX.test(url), {
    message:
      "Invalid YouTube URL. Expected format: youtube.com/watch?v=ID, youtu.be/ID, or youtube.com/shorts/ID",
  });

export const DetailLevelSchema = z
  .enum(["brief", "medium", "detailed"])
  .default("medium");

export const ResolutionSchema = z
  .enum(["thumbnail", "small", "medium", "large", "full"])
  .default("large");

export const SummarizeInputSchema = z.object({
  youtube_url: YouTubeUrlSchema,
  detail_level: DetailLevelSchema,
});

export const AskInputSchema = z.object({
  youtube_url: YouTubeUrlSchema,
  question: z.string().min(1, "Question cannot be empty"),
});

export const ExtractScreenshotsInputSchema = z.object({
  youtube_url: YouTubeUrlSchema,
  count: z.number().int().min(1).max(20).default(5),
  output_dir: z.string().optional(),
  focus: z.string().optional(),
  resolution: ResolutionSchema,
});

export const GetVideoTimestampsInputSchema = z.object({
  youtube_url: YouTubeUrlSchema,
  count: z.number().int().min(1).max(20).default(5),
  focus: z.string().optional(),
});

export const ExtractFramesInputSchema = z.object({
  youtube_url: YouTubeUrlSchema,
  timestamps: z.array(z.number().min(0)).min(1).max(20),
  output_dir: z.string().optional(),
  resolution: ResolutionSchema,
});

export const SearchVideosInputSchema = z.object({
  query: z.string().min(1, "Query cannot be empty"),
  max_results: z.number().int().min(1).max(25).default(10),
  order: z
    .enum(["relevance", "date", "viewCount", "rating"])
    .default("relevance"),
});

const VIDEO_ID_REGEX = /^[\w-]{11}$/;

// Accepts a bare 11-character video ID or any supported YouTube URL.
export const VideoRefSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (VIDEO_ID_REGEX.test(value)) return value;
    try {
      return extractVideoId(value);
    } catch {
      ctx.addIssue({ code: "custom", message: `Not a YouTube video ID or URL: ${value}` });
      return z.NEVER;
    }
  });

export const PlaylistIdSchema = z.string().trim().min(1, "Playlist ID cannot be empty");

export const ListPlaylistsInputSchema = z.object({});

export const CreatePlaylistInputSchema = z.object({
  title: z.string().trim().min(1, "Title cannot be empty").max(150),
  description: z.string().max(5000).default(""),
  privacy: z.enum(["private", "unlisted", "public"]).default("private"),
});

export const AddToPlaylistInputSchema = z.object({
  playlist_id: PlaylistIdSchema,
  videos: z.array(VideoRefSchema).min(1).max(100),
});

export const RenamePlaylistInputSchema = z.object({
  playlist_id: PlaylistIdSchema,
  title: z.string().trim().min(1, "Title cannot be empty").max(150),
});

export type SummarizeInput = z.infer<typeof SummarizeInputSchema>;
export type AskInput = z.infer<typeof AskInputSchema>;
export type ExtractScreenshotsInput = z.infer<typeof ExtractScreenshotsInputSchema>;
export type GetVideoTimestampsInput = z.infer<typeof GetVideoTimestampsInputSchema>;
export type ExtractFramesInput = z.infer<typeof ExtractFramesInputSchema>;
export type SearchVideosInput = z.infer<typeof SearchVideosInputSchema>;
export type DetailLevel = z.infer<typeof DetailLevelSchema>;
export type Resolution = z.infer<typeof ResolutionSchema>;

export function validateYouTubeUrl(url: string): string {
  return YouTubeUrlSchema.parse(url);
}

export function extractVideoId(url: string): string {
  const validUrl = validateYouTubeUrl(url);
  const urlObj = new URL(validUrl);

  if (urlObj.hostname === "youtu.be") {
    return urlObj.pathname.slice(1);
  }

  if (
    urlObj.hostname === "www.youtube.com" ||
    urlObj.hostname === "youtube.com"
  ) {
    if (urlObj.pathname === "/watch") {
      const videoId = urlObj.searchParams.get("v");
      if (videoId) return videoId;
    }
    if (urlObj.pathname.startsWith("/shorts/")) {
      return urlObj.pathname.split("/")[2];
    }
  }

  throw new Error(`Cannot extract video ID from: ${url}`);
}
