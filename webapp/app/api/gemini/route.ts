import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { 
  processImageBuffer, 
  downloadAndProcessImage,
  mimeFor 
} from '../../../../src/utils/image-converter';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const prompt = formData.get('prompt') as string;
    
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
      
      // Process image (convert HEIC if needed)
      const processed = await processImageBuffer(buffer, file.name);
      
      const tempPath = join(tmpdir(), `gemini_upload_${Date.now()}_${processed.filename}`);
      writeFileSync(tempPath, processed.buffer);
      inputPaths.push(tempPath);
      tempFiles.push(tempPath);
    }
    
    // Process URLs
    const urls = formData.getAll('urls') as string[];
    for (const url of urls) {
      if (url && url.trim()) {
        // Download and process image (convert HEIC if needed)
        const processed = await downloadAndProcessImage(url);
        
        const tempPath = join(tmpdir(), `gemini_url_${Date.now()}_${processed.filename}`);
        writeFileSync(tempPath, processed.buffer);
        inputPaths.push(tempPath);
        tempFiles.push(tempPath);
      }
    }
    
    if (inputPaths.length === 0) {
      return NextResponse.json({ error: 'At least one image is required' }, { status: 400 });
    }

    // Call Gemini API
    const ai = new GoogleGenAI({ apiKey });
    
    const contents: any[] = [{ text: prompt }].concat(
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
    const outputImages: { data: string }[] = [];
    
    for (const part of res.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        outputImages.push({
          data: part.inlineData.data
        });
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