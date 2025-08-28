/**
 * Convert HEIC/HEIF image to JPEG
 * This is a server-side utility that can be used by both CLI and webapp
 * Uses macOS sips command as primary method, falls back to sharp if available
 */
export async function convertHeicToJpeg(
  input: Buffer,
  quality: number = 90
): Promise<Buffer> {
  const platform = process.platform;
  
  // Try macOS sips first (most reliable for HEIC)
  if (platform === 'darwin') {
    try {
      const { execSync } = await import('child_process');
      const fs = await import('fs');
      const os = await import('os');
      const path = await import('path');
      
      // Create temp files
      const tmpDir = os.tmpdir();
      const inputPath = path.join(tmpDir, `heic_${Date.now()}.heic`);
      const outputPath = path.join(tmpDir, `heic_${Date.now()}.jpg`);
      
      // Write input buffer to temp file
      fs.writeFileSync(inputPath, input);
      
      try {
        // Convert using sips (macOS built-in tool)
        execSync(`sips -s format jpeg -s formatOptions ${quality} "${inputPath}" --out "${outputPath}"`, {
          stdio: 'pipe'
        });
        
        // Read the converted file
        const output = fs.readFileSync(outputPath);
        
        // Clean up temp files
        try {
          fs.unlinkSync(inputPath);
          fs.unlinkSync(outputPath);
        } catch {
          // Ignore cleanup errors
        }
        
        console.log('Successfully converted HEIC using macOS sips');
        return output;
      } catch (sipsError) {
        // Clean up on error
        try {
          fs.unlinkSync(inputPath);
          fs.unlinkSync(outputPath);
        } catch {
          // Ignore cleanup errors
        }
        throw sipsError;
      }
    } catch (error) {
      console.warn('sips conversion failed, trying sharp fallback:', error);
      // Fall through to sharp attempt
    }
  }
  
  // Fallback to Sharp (may not support HEVC codec)
  try {
    const Sharp = (await import('sharp')).default;
    
    const output = await Sharp(input, { 
      limitInputPixels: false
    })
      .rotate()
      .jpeg({ 
        quality,
        mozjpeg: true
      })
      .toBuffer();

    console.log('Successfully converted using Sharp');
    return output;
  } catch (error) {
    console.error('Sharp conversion also failed:', error);
    throw new Error(`Failed to convert HEIC to JPEG. Platform: ${platform}. ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if a file is likely a HEIC/HEIF file based on name or MIME type
 */
export function isHeicFile(fileName: string, mimeType?: string): boolean {
  const lowerName = fileName.toLowerCase();
  const isHeicByName = lowerName.endsWith('.heic') || lowerName.endsWith('.heif');
  const isHeicByMime = mimeType === 'image/heic' || mimeType === 'image/heif';
  
  return isHeicByName || isHeicByMime;
}