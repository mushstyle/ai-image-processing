import { parseArgs } from 'util'
import { getOpenAIClient } from './src/utils/openai.js'
import { 
  fetchImageFromUrl, 
  toFile, 
  generateOutputFilename, 
  saveBase64Image,
  isLocalFile,
  readLocalImage
} from './src/utils/image.js'

async function editImage(imagePath, prompt, options = {}) {
  const { outputFile, outputDir, quality, size } = options
  
  try {
    let imageBuffer
    
    if (isLocalFile(imagePath)) {
      console.log('📂 Reading local image file...')
      imageBuffer = readLocalImage(imagePath)
      console.log('✅ Image loaded successfully')
    } else {
      console.log('📥 Downloading image from URL...')
      imageBuffer = await fetchImageFromUrl(imagePath)
      console.log('✅ Image downloaded successfully')
    }
    
    if (quality && quality !== 'auto') {
      console.log(`🎨 Quality setting: ${quality}`)
    }
    
    console.log('🔄 Converting image for OpenAI API...')
    const imageFile = await toFile(imageBuffer, 'source-image.png', { type: 'image/png' })
    
    console.log('🎨 Sending edit request to OpenAI...')
    const client = getOpenAIClient()
    
    const startTime = Date.now()
    const response = await client.images.edit({
      model: 'gpt-image-1',
      image: imageFile,
      prompt: prompt,
      n: 1,
      size: size || '1024x1024',
      quality: quality || 'auto'
    })
    const duration = (Date.now() - startTime) / 1000
    
    console.log(`✅ Image edited successfully (${duration.toFixed(1)}s)`)
    
    if (response.data[0].revised_prompt) {
      console.log(`📝 Revised prompt: ${response.data[0].revised_prompt}`)
    }
    
    // gpt-image-1 always returns base64 data
    const outputPath = generateOutputFilename(outputFile, outputDir)
    
    if (response.data[0].b64_json) {
      saveBase64Image(response.data[0].b64_json, outputPath)
      console.log(`💾 Saved edited image to: ${outputPath}`)
    } else {
      throw new Error('No base64 data in response from OpenAI API')
    }
    
    return outputPath
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    
    if (error.message.includes('API key')) {
      console.error('💡 Make sure your OPENAI_API_KEY is set in your .env file')
    }
    
    process.exit(1)
  }
}

// Parse command line arguments manually to support = syntax
function parseCustomArgs(args) {
  const parsed = {
    url: null,
    prompt: null,
    output: null,
    'output-dir': null,
    quality: null,
    size: null,
    help: false
  }
  
  for (let i = 2; i < args.length; i++) {
    const arg = args[i]
    
    if (arg === '-h' || arg === '--help') {
      parsed.help = true
      continue
    }
    
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=')
      
      if (key in parsed) {
        parsed[key] = value || true
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1)
      const keyMap = { u: 'url', p: 'prompt', o: 'output' }
      
      if (keyMap[key] && i + 1 < args.length && !args[i + 1].startsWith('-')) {
        parsed[keyMap[key]] = args[++i]
      }
    }
  }
  
  return parsed
}

async function main() {
  const values = parseCustomArgs(process.argv)
  
  if (values.help || !values.url || !values.prompt) {
    console.log(`
AI Image Editor - Edit images using OpenAI's gpt-image-1 model

Usage: npm run edit -- --url=<image-path-or-url> --prompt=<edit-prompt> [options]

Options:
  --url=<path>        Path to local image file or URL of source image (required)
  --prompt=<text>     Text description of desired edits (required, max 32000 chars)
  --output=<filename> Custom output filename (optional)
  --output-dir=<dir>  Directory to save the output file (optional)
  --quality=<level>   Image quality: auto, high, medium, or low (default: auto)
  --size=<dimensions> Output size: 1024x1024, 1536x1024, or 1024x1536 (default: 1024x1024)
  -h, --help          Show this help message

Examples:
  # Edit from URL
  npm run edit -- --url="https://example.com/image.jpg" --prompt="Add a sunset background"
  
  # Edit local file
  npm run edit -- --url="./photo.png" --prompt="Make it look vintage"
  npm run edit -- --url="/path/to/image.jpg" --prompt="Add a blue sky" --output="sky.png"
  
  # Save to specific directory
  npm run edit -- --url="image.jpg" --prompt="Add effects" --output-dir="./edited"
`)
    process.exit(values.help ? 0 : 1)
  }
  
  if (values.prompt.length > 32000) {
    console.error('❌ Error: Prompt exceeds maximum length of 32000 characters')
    process.exit(1)
  }
  
  if (values.quality && !['auto', 'high', 'medium', 'low'].includes(values.quality)) {
    console.error('❌ Error: Invalid quality level. Must be: auto, high, medium, or low')
    process.exit(1)
  }
  
  if (values.size && !['1024x1024', '1536x1024', '1024x1536'].includes(values.size)) {
    console.error('❌ Error: Invalid size. Must be: 1024x1024, 1536x1024, or 1024x1536')
    process.exit(1)
  }
  
  
  if (!isLocalFile(values.url)) {
    try {
      new URL(values.url)
    } catch {
      console.error('❌ Error: Invalid URL format')
      process.exit(1)
    }
  }
  
  await editImage(values.url, values.prompt, {
    outputFile: values.output,
    outputDir: values['output-dir'],
    quality: values.quality,
    size: values.size
  })
}

main().catch(console.error)