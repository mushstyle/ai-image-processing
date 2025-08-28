export const runtime = 'nodejs'; // IMPORTANT: sharp needs Node runtime, not edge

import { NextRequest, NextResponse } from 'next/server';
import { convertHeicToJpeg, isHeicFile } from '../../../../lib/heic-converter';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    
    if (!(file instanceof File)) {
      return new NextResponse('Missing file', { status: 400 });
    }

    // Check if it's actually a HEIC file
    if (!isHeicFile(file.name, file.type)) {
      // If not HEIC, just return the original file
      const buffer = Buffer.from(await file.arrayBuffer());
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'Cache-Control': 'no-store',
        },
      });
    }

    // Convert HEIC to JPEG
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const outputBuffer = await convertHeicToJpeg(inputBuffer, 90);

    // NextResponse expects Uint8Array, not Buffer directly
    return new NextResponse(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('HEIC convert API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new NextResponse(
      `Convert error: ${errorMessage}`,
      { status: 500 }
    );
  }
}