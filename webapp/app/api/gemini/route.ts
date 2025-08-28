import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname, extname, basename } from 'path';
import { tmpdir } from 'os';

const mimeFor = (filename: string): string => {
  const ext = extname(filename).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "application/octet-stream";
};

const getAvailableFilename = (basePath: string): string => {
  if (!existsSync(basePath)) {
    return basePath;
  }
  
  const dir = dirname(basePath);
  const ext = extname(basePath);
  const nameWithoutExt = basename(basePath, ext);
  
  const match = nameWithoutExt.match(/^(.+?)_?(\d+)$/);
  let baseName = match ? match[1] : nameWithoutExt;
  let counter = match ? parseInt(match[2], 10) : 1;
  
  let newPath = basePath;
  while (existsSync(newPath)) {
    counter++;
    newPath = join(dir, `${baseName}_${counter}${ext}`);
  }
  
  return newPath;
};

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const prompt = formData.get('prompt') as string;
    const outputDir = formData.get('outputDir') as string || 'outputs';
    const outputPrefix = formData.get('outputPrefix') as string || 'gemini_out_';
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    // Collect all images (files and URLs)
    const inputPaths: string[] = [];
    const tempFiles: string[] = [];
    
    // Process uploaded files
    const files = formData.getAll('files') as File[];
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const tempPath = join(tmpdir(), `gemini_upload_${Date.now()}_${file.name}`);
      writeFileSync(tempPath, buffer);
      inputPaths.push(tempPath);
      tempFiles.push(tempPath);
    }
    
    // Process URLs
    const urls = formData.getAll('urls') as string[];
    for (const url of urls) {
      if (url && url.trim()) {
        const buffer = await downloadImage(url);
        const tempPath = join(tmpdir(), `gemini_url_${Date.now()}.png`);
        writeFileSync(tempPath, buffer);
        inputPaths.push(tempPath);
        tempFiles.push(tempPath);
      }
    }
    
    if (inputPaths.length === 0) {
      return NextResponse.json({ error: 'At least one image is required' }, { status: 400 });
    }

    // Call Gemini API
    const ai = new GoogleGenAI({ apiKey });
    
    const contents = [{ text: prompt }].concat(
      inputPaths.map((p) => ({
        inlineData: {
          mimeType: mimeFor(p),
          data: readFileSync(p).toString("base64"),
        },
      }))
    );

    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents,
    });

    // Process output images
    const outputImages: { filename: string; data: string }[] = [];
    let i = 1;
    
    for (const part of res.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const filename = `${outputPrefix}${i}.png`;
        outputImages.push({
          filename,
          data: part.inlineData.data
        });
        i++;
      }
    }
    
    // Clean up temp files
    for (const file of tempFiles) {
      try {
        const fs = await import('fs/promises');
        await fs.unlink(file);
      } catch {
        // Ignore cleanup errors
      }
    }
    
    return NextResponse.json({
      success: true,
      images: outputImages,
      message: `Generated ${outputImages.length} image(s)`
    });
    
  } catch (error: any) {
    console.error('Gemini API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process images' },
      { status: 500 }
    );
  }
}