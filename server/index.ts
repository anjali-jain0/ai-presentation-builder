import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { streamChat, ChatMessage } from "./ai/chat";
import { UserSelection } from "./ai/systemPrompt";
import { Deck } from "../src/types/deck";

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, hasApiKey: Boolean(process.env.GEMINI_API_KEY) });
});

app.post("/api/chat", async (req, res) => {
  console.log("[chat] request received", { messages: req.body?.messages?.length, slides: req.body?.deck?.slides?.length });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server. See README for setup." });
    return;
  }

  const messages = req.body?.messages as ChatMessage[] | undefined;
  const deck = req.body?.deck as Deck | undefined;
  const selection = req.body?.selection as UserSelection | undefined;
  if (!Array.isArray(messages) || !deck) {
    res.status(400).json({ error: "Request must include { messages, deck }." });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const send = (event: unknown) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    await streamChat(apiKey, messages, deck, send, selection);
  } catch (err: any) {
    send({ type: "error", message: err?.message ?? "Unexpected server error." });
  } finally {
    res.end();
  }
});

if (process.env.NODE_ENV === "production") {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const distDir = path.join(__dirname, "..", "dist");
  app.use(express.static(distDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

// hosts like Render/Railway assign a port via PORT and route traffic there, so
// production has to respect it. Local dev avoids PORT on purpose (reserved for
// Vite's dev server, running alongside this one) and uses API_PORT instead.
const PORT = process.env.PORT ? Number(process.env.PORT) : process.env.API_PORT ? Number(process.env.API_PORT) : 8787;
app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
