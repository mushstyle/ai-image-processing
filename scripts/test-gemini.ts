import { editOrCompose } from '../src/services/gemini.js';
import { 
  fetchImageFromUrl, 
  isLocalFile, 
  readLocalImage,
  generateOutputFilename
} from '../src/utils/image.js';
import { writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { mkdirSync } from 'fs';

interface TestArgs {
  images: string[];
  prompt: string;
  outputDir?: string;
  outputPrefix?: string;
}

function parseArgs(): TestArgs {
  const args = process.argv.slice(2);
  const result: TestArgs = {
    images: [],
    prompt: '',
    outputDir: 'outputs',
    outputPrefix: 'gemini_out_'
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      console.log(`
Gemini Image Test - Test image editing/composition with Google's Gemini API

Usage: npm run gemini-test -- --image=<path> [--image=<path>...] --prompt=<text> [options]

Options:
  --image=<path>      Path to image file or URL (can specify multiple)
  --prompt=<text>     Text description of what to do with the image(s)
  --output-dir=<dir>  Directory to save output files (default: outputs)
  --output-prefix=<p> Prefix for output filenames (default: gemini_out_)
  -h, --help          Show this help message

Examples:
  # Single image edit
  npm run gemini-test -- --image="./photo.png" --prompt="Remove background and add studio lighting"
  
  # Multiple images (style transfer)
  npm run gemini-test -- --image="./room.jpg" --image="./style.png" --prompt="Apply the style from second image to first"
  
  # From URL
  npm run gemini-test -- --image="https://example.com/image.jpg" --prompt="Make it look vintage"
`);
      process.exit(0);
    }
    
    if (arg.startsWith('--image=')) {
      result.images.push(arg.substring(8));
    } else if (arg.startsWith('--prompt=')) {
      result.prompt = arg.substring(9);
    } else if (arg.startsWith('--output-dir=')) {
      result.outputDir = arg.substring(13);
    } else if (arg.startsWith('--output-prefix=')) {
      result.outputPrefix = arg.substring(16);
    }
  }
  
  return result;
}

async function prepareImage(imagePath: string): Promise<string> {
  try {
    let imageBuffer: Buffer;
    const tempPath = resolve('temp', `gemini_input_${Date.now()}_${Math.random().toString(36).substring(7)}.png`);
    
    if (isLocalFile(imagePath)) {
      console.log(`📂 Reading local image: ${imagePath}`);
      imageBuffer = readLocalImage(imagePath);
    } else {
      console.log(`📥 Downloading image from: ${imagePath}`);
      imageBuffer = await fetchImageFromUrl(imagePath);
    }
    
    // Ensure temp directory exists
    const tempDir = dirname(tempPath);
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }
    
    // Save to temporary file for Gemini processing
    writeFileSync(tempPath, imageBuffer);
    console.log(`✅ Prepared image for processing: ${tempPath}`);
    
    return tempPath;
  } catch (error: any) {
    throw new Error(`Failed to prepare image ${imagePath}: ${error.message}`);
  }
}

async function cleanupTempFiles(files: string[]) {
  const fs = await import('fs/promises');
  for (const file of files) {
    try {
      await fs.unlink(file);
    } catch {
      // Ignore cleanup errors
    }
  }
}

async function main() {
  const args = parseArgs();
  
  // Validation
  if (args.images.length === 0) {
    console.error('❌ Error: At least one image is required');
    console.log('Use --help for usage information');
    process.exit(1);
  }
  
  if (!args.prompt) {
    console.error('❌ Error: Prompt is required');
    console.log('Use --help for usage information');
    process.exit(1);
  }
  
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ Error: GEMINI_API_KEY is not set in .env file');
    process.exit(1);
  }
  
  console.log(`🚀 Starting Gemini image processing...`);
  console.log(`📝 Prompt: "${args.prompt}"`);
  console.log(`🖼️  Processing ${args.images.length} image(s)`);
  
  const tempFiles: string[] = [];
  
  try {
    // Prepare all images
    const inputPaths: string[] = [];
    for (const imagePath of args.images) {
      const preparedPath = await prepareImage(imagePath);
      inputPaths.push(preparedPath);
      tempFiles.push(preparedPath);
    }
    
    // Ensure output directory exists
    if (!existsSync(args.outputDir)) {
      mkdirSync(args.outputDir, { recursive: true });
    }
    
    // Process with Gemini
    console.log(`\n🎨 Sending to Gemini API...`);
    const startTime = Date.now();
    
    const outputPaths = await editOrCompose({
      inputPaths,
      prompt: args.prompt,
      outPrefix: resolve(args.outputDir, args.outputPrefix)
    });
    
    const duration = (Date.now() - startTime) / 1000;
    
    if (outputPaths.length > 0) {
      console.log(`\n✅ Successfully created ${outputPaths.length} image(s) in ${duration.toFixed(1)}s:`);
      outputPaths.forEach(path => {
        console.log(`   📁 ${path}`);
      });
    } else {
      console.log(`\n⚠️ Gemini processing completed in ${duration.toFixed(1)}s but no images were generated`);
    }
    
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    
    if (error.message.includes('GEMINI_API_KEY')) {
      console.error('💡 Make sure your GEMINI_API_KEY is set correctly in your .env file');
    }
    
    process.exit(1);
  } finally {
    // Clean up temporary files
    await cleanupTempFiles(tempFiles);
  }
}

main().catch(console.error);