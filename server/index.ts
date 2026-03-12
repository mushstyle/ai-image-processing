import "dotenv/config";

import cors from "cors";
import {
  clerkClient,
  clerkMiddleware,
  getAuth,
} from "@clerk/express";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import multer, { MulterError } from "multer";
import path from "path";
import { fileURLToPath } from "url";

import { isAllowedEmailAddress } from "../lib/auth.js";
import { generateWorkshopImages } from "../lib/gemini.js";
import { convertHeicToJpeg, isHeicFile } from "../lib/heic-converter.js";
import {
  deletePrompt,
  listSavedPrompts,
  savePrompt,
} from "../lib/prompt-store.js";

const DEFAULT_PORT = 3001;
const DEFAULT_DOMAIN = "banana1.mush.style";
const ALLOWED_ORIGINS = new Set([
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "http://127.0.0.1:3001",
  "http://localhost:3001",
]);
const PROD_ORIGIN = `https://${process.env.APP_DOMAIN?.trim() || DEFAULT_DOMAIN}`;

process.env.CLERK_PUBLISHABLE_KEY ||= process.env.VITE_CLERK_PUBLISHABLE_KEY;

type SessionState = {
  authenticated: boolean;
  allowed: boolean;
  email: string | null;
  userId: string | null;
};

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 12,
  },
});

app.set("trust proxy", true);
app.use("/api",
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.has(origin) || origin === PROD_ORIGIN) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed"));
    },
    allowedHeaders: ["Authorization", "Content-Type"],
    methods: ["GET", "POST", "DELETE"],
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use("/api", clerkMiddleware());

app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/session", async (req, res) => {
  try {
    const session = await getSessionState(req);

    if (!session.authenticated) {
      res.status(401).json({
        authenticated: false,
        allowed: false,
        email: null,
      });
      return;
    }

    if (!session.allowed) {
      res.status(403).json({
        authenticated: true,
        allowed: false,
        email: session.email,
      });
      return;
    }

    res.json({
      authenticated: true,
      allowed: true,
      email: session.email,
    });
  } catch (error) {
    respondWithApiError(res, error, "Failed to load session");
  }
});

app.get("/api/prompts", requireAllowedUser, async (_req, res) => {
  try {
    const prompts = await listSavedPrompts();
    res.json({ prompts });
  } catch (error) {
    respondWithApiError(res, error, "Failed to load prompts");
  }
});

app.post("/api/prompts", requireAllowedUser, async (req, res) => {
  try {
    const body = req.body as { text?: unknown };
    if (typeof body.text !== "string") {
      res.status(400).json({ error: "Invalid prompt text" });
      return;
    }

    const prompt = await savePrompt(body.text);
    res.json({ success: true, prompt });
  } catch (error) {
    respondWithApiError(res, error, "Failed to save prompt");
  }
});

app.delete("/api/prompts", requireAllowedUser, async (req, res) => {
  try {
    const id = typeof req.query.id === "string" ? req.query.id : "";

    if (!id) {
      res.status(400).json({ error: "Prompt ID required" });
      return;
    }

    await deletePrompt(id);
    res.json({ success: true });
  } catch (error) {
    respondWithApiError(res, error, "Failed to delete prompt");
  }
});

app.post(
  "/api/convert-heic",
  requireAllowedUser,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).send("Missing file");
        return;
      }

      if (!isHeicFile(req.file.originalname, req.file.mimetype)) {
        res
          .status(200)
          .type(req.file.mimetype || "application/octet-stream")
          .send(req.file.buffer);
        return;
      }

      const outputBuffer = await convertHeicToJpeg(req.file.buffer, 90);
      res.status(200).type("image/jpeg").send(outputBuffer);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown convert error";
      res.status(500).send(`Convert error: ${message}`);
    }
  },
);

app.post(
  "/api/gemini",
  requireAllowedUser,
  upload.array("files", 12),
  async (req, res) => {
    try {
      const prompt = String(req.body.prompt || "");

      if (!prompt.trim()) {
        res.status(400).json({ error: "Prompt is required" });
        return;
      }

      const files = Array.isArray(req.files)
        ? req.files.map((file) => ({
            data: file.buffer,
            name: file.originalname,
            mimeType: file.mimetype,
          }))
        : [];

      const urls = toStringArray(req.body.urls);
      const result = await generateWorkshopImages({ prompt, files, urls });

      res.json({
        success: true,
        images: result.images,
        notes: result.notes,
        message: `Generated ${result.images.length} image(s)`,
      });
    } catch (error) {
      respondWithApiError(res, error, "Failed to process images");
    }
  },
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistDir = path.resolve(__dirname, "../client");
const clientIndexPath = path.join(clientDistDir, "index.html");

if (process.env.NODE_ENV === "production") {
  app.use(express.static(clientDistDir));
  app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => {
    res.sendFile(clientIndexPath);
  });
}

app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
  void _next;

  if (error instanceof MulterError) {
    res.status(400).json({ error: error.message });
    return;
  }

  if (error instanceof Error && error.message === "Origin not allowed") {
    res.status(403).json({ error: error.message });
    return;
  }

  if (req.path.startsWith("/api")) {
    respondWithApiError(res, error, "Internal server error");
    return;
  }

  res.status(500).send("Internal server error");
});

const port = Number.parseInt(process.env.PORT || `${DEFAULT_PORT}`, 10);
const host = process.env.HOST || undefined;

const onListen = () => {
  const displayHost = host || "0.0.0.0";
  console.log(`nano-banana backend listening on http://${displayHost}:${port}`);
};

if (host) {
  app.listen(port, host, onListen);
} else {
  app.listen(port, onListen);
}

async function getSessionState(req: Request): Promise<SessionState> {
  const auth = getAuth(req);

  if (!auth.userId) {
    return {
      authenticated: false,
      allowed: false,
      email: null,
      userId: null,
    };
  }

  const user = await clerkClient.users.getUser(auth.userId);
  const email =
    user.primaryEmailAddress?.emailAddress ||
    user.emailAddresses[0]?.emailAddress ||
    null;

  return {
    authenticated: true,
    allowed: email ? isAllowedEmailAddress(email) : false,
    email,
    userId: auth.userId,
  };
}

async function requireAllowedUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const session = await getSessionState(req);

    if (!session.authenticated) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!session.allowed) {
      res.status(403).json({
        error: "Your email address is not authorized to access this application.",
        email: session.email,
      });
      return;
    }

    next();
  } catch (error) {
    respondWithApiError(res, error, "Failed to authenticate request");
  }
}

function toStringArray(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map((value) => String(value)).filter(Boolean);
  }

  if (typeof input === "string" && input.trim()) {
    return [input];
  }

  return [];
}

function respondWithApiError(
  res: Response,
  error: unknown,
  fallbackMessage: string,
): void {
  console.error(fallbackMessage, error);
  const message = error instanceof Error ? error.message : fallbackMessage;
  res.status(500).json({ error: message || fallbackMessage });
}
