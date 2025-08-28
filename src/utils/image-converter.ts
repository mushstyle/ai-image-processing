import * as fs from "node:fs";
import * as path from "node:path";
import { Buffer } from "node:buffer";

// Dynamic import for heic-convert (CommonJS module)
const convertHeic = async (buffer: Buffer): Promise<Buffer> => {
  const convert = require('heic-convert');
  return await convert({
    buffer: buffer,
    format: 'JPEG',
    quality: 0.95
  });
};

export const isHeic = (filename: string): boolean => {
  const ext = path.extname(filename).toLowerCase();
  return ext === '.heic' || ext === '.heif';
};

export const mimeFor = (filename: string): string => {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".heic" || ext === ".heif") return "image/jpeg"; // Will be converted to JPEG
  return "application/octet-stream";
};

/**
 * Process an image buffer, converting HEIC to JPEG if needed
 * @param buffer - The image buffer
 * @param filename - The original filename (used to detect HEIC)
 * @returns Object with processed buffer and new filename
 */
export async function processImageBuffer(
  buffer: Buffer,
  filename: string
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  if (isHeic(filename)) {
    try {
      const convertedBuffer = await convertHeic(buffer);
      const newFilename = filename.replace(/\.hei[cf]$/i, '.jpg');
      return {
        buffer: convertedBuffer,
        filename: newFilename,
        mimeType: 'image/jpeg'
      };
    } catch (error) {
      console.error('HEIC conversion error:', error);
      throw new Error(`Failed to convert HEIC file: ${filename}`);
    }
  }
  
  return {
    buffer,
    filename,
    mimeType: mimeFor(filename)
  };
}

/**
 * Process a file path, converting HEIC to JPEG if needed and saving to temp location
 * @param inputPath - Path to the input file
 * @param outputDir - Directory to save the processed file
 * @returns Path to the processed file
 */
export async function processImageFile(
  inputPath: string,
  outputDir?: string
): Promise<string> {
  const buffer = fs.readFileSync(inputPath);
  const filename = path.basename(inputPath);
  const processed = await processImageBuffer(buffer, filename);
  
  // If no conversion needed and no output dir specified, return original path
  if (processed.filename === filename && !outputDir) {
    return inputPath;
  }
  
  // Save processed file
  const dir = outputDir || path.dirname(inputPath);
  const outputPath = path.join(dir, `processed_${Date.now()}_${processed.filename}`);
  fs.writeFileSync(outputPath, processed.buffer);
  
  return outputPath;
}

/**
 * Download and process an image from URL
 * @param url - The image URL
 * @returns Object with processed buffer and suggested filename
 */
export async function downloadAndProcessImage(
  url: string
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Extract filename from URL or use default
  const urlPath = new URL(url).pathname;
  const filename = path.basename(urlPath) || 'downloaded_image.png';
  
  return processImageBuffer(buffer, filename);
}