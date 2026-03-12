import { GoogleGenAI, Modality } from "@google/genai";
import { extname } from "path";

const DEFAULT_MODEL = "gemini-3.1-flash-image-preview";

export interface GeneratedImage {
  data: string;
  mimeType: string;
}

export interface GenerationResult {
  images: GeneratedImage[];
  notes: string[];
}

export interface InputImageFile {
  data: Buffer;
  name: string;
  mimeType?: string | null;
}

type InlineImagePart = {
  inlineData: {
    data: string;
    mimeType: string;
  };
};

function getGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY must be configured");
  }

  return apiKey;
}

function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

function normalizeMimeType(filename: string, mimeType?: string | null): string {
  if (mimeType?.startsWith("image/")) {
    return mimeType;
  }

  switch (extname(filename).toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".bmp":
      return "image/bmp";
    default:
      return "image/png";
  }
}

function fileToInlinePart(file: InputImageFile): InlineImagePart {
  return {
    inlineData: {
      data: file.data.toString("base64"),
      mimeType: normalizeMimeType(file.name, file.mimeType),
    },
  };
}

async function urlToInlinePart(url: string): Promise<InlineImagePart> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch image URL: ${response.status}`);
  }

  const mimeType = normalizeMimeType(
    new URL(url).pathname,
    response.headers.get("content-type"),
  );

  if (!mimeType.startsWith("image/")) {
    throw new Error("URL did not return an image");
  }

  const arrayBuffer = await response.arrayBuffer();

  return {
    inlineData: {
      data: Buffer.from(arrayBuffer).toString("base64"),
      mimeType,
    },
  };
}

export async function generateWorkshopImages(args: {
  prompt: string;
  files: InputImageFile[];
  urls: string[];
}): Promise<GenerationResult> {
  const prompt = args.prompt.trim();
  if (!prompt) {
    throw new Error("Prompt is required");
  }

  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  const imageParts: InlineImagePart[] = [];

  for (const file of args.files) {
    imageParts.push(fileToInlinePart(file));
  }

  for (const url of args.urls.map((value) => value.trim()).filter(Boolean)) {
    imageParts.push(await urlToInlinePart(url));
  }

  const response = await ai.models.generateContent({
    model: getGeminiModel(),
    contents: [{ text: prompt }, ...imageParts],
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
      temperature: 0,
    },
  });

  const images: GeneratedImage[] = [];
  const notes: string[] = [];

  for (const candidate of response.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (part.inlineData?.data) {
        images.push({
          data: part.inlineData.data,
          mimeType: part.inlineData.mimeType || "image/png",
        });
      } else if (part.text?.trim()) {
        notes.push(part.text.trim());
      }
    }
  }

  return { images, notes };
}
