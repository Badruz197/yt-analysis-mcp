#!/usr/bin/env node
// One-time Google sign-in for the playlist tools. Run on your own computer:
//   YOUTUBE_OAUTH_CLIENT_ID=... YOUTUBE_OAUTH_CLIENT_SECRET=... npm run auth:youtube
// It opens a browser for consent and prints a refresh token to store as
// YOUTUBE_OAUTH_REFRESH_TOKEN. Nothing is written to disk.
import { createServer } from "node:http";
import { exec } from "node:child_process";
import type { AddressInfo } from "node:net";
import { createOAuthClient, YOUTUBE_OAUTH_SCOPE } from "./youtube-playlists.js";

const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID;
const clientSecret = process.env.YOUTUBE_OAUTH_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  console.error(
    "Set YOUTUBE_OAUTH_CLIENT_ID and YOUTUBE_OAUTH_CLIENT_SECRET (from your Google Cloud OAuth client, type Desktop app) and run again."
  );
  process.exit(1);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  if (!code && !error) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "Content-Type": "text/plain" });
  if (error) {
    res.end(`Sign-in failed: ${error}. You can close this tab.`);
    console.error(`Sign-in failed: ${error}`);
    server.close();
    process.exitCode = 1;
    return;
  }
  try {
    const { tokens } = await oauth.getToken(code!);
    res.end("Signed in. You can close this tab and return to the terminal.");
    if (!tokens.refresh_token) {
      console.error(
        "Google returned no refresh token. Remove this app's access at https://myaccount.google.com/permissions and run again."
      );
      process.exitCode = 1;
    } else {
      console.log("\nSigned in. Store this as YOUTUBE_OAUTH_REFRESH_TOKEN (keep it secret, don't paste it into chats):\n");
      console.log(tokens.refresh_token);
      console.log("");
    }
  } catch (e) {
    res.end("Token exchange failed. See the terminal.");
    console.error("Token exchange failed:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  }
  server.close();
});

let oauth: ReturnType<typeof createOAuthClient>;

server.listen(0, "127.0.0.1", () => {
  const { port } = server.address() as AddressInfo;
  oauth = createOAuthClient(clientId, clientSecret, `http://127.0.0.1:${port}`);
  const authUrl = oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [YOUTUBE_OAUTH_SCOPE],
  });
  console.log("Opening your browser to sign in to Google. If it doesn't open, visit:\n");
  console.log(authUrl + "\n");
  const opener =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start \"\"" : "xdg-open";
  exec(`${opener} "${authUrl}"`, () => {});
});
