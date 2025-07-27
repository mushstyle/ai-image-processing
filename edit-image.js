import { parseArgs } from 'util'
import { getOpenAIClient } from './utils/openai.js'
import { 
  fetchImageFromUrl, 
  toFile, 
  generateOutputFilename, 
  saveBase64Image,
  isLocalFile,
  readLocalImage
} from './utils/image.js'

async function editImage(imagePath, prompt, options = {}) {
  const { outputFile, outputDir, urlOnly } = options
  
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
    
    console.log('🔄 Converting image for OpenAI API...')
    const imageFile = await toFile(imageBuffer, 'source-image.png', { type: 'image/png' })
    
    console.log('🎨 Sending edit request to OpenAI...')
    const client = getOpenAIClient()
    
    const response = await client.images.edit({
      model: 'gpt-image-1',
      image: imageFile,
      prompt: prompt,
      n: 1
    })
    
    console.log('✅ Image edited successfully')
    
    if (response.data[0].revised_prompt) {
      console.log(`📝 Revised prompt: ${response.data[0].revised_prompt}`)
    }
    
    // If user wants URL only and we got a URL, return it
    if (urlOnly && response.data[0].url) {
      console.log(`🔗 Generated image URL: ${response.data[0].url}`)
      return response.data[0].url
    }
    
    // Otherwise, download and save the image
    const outputPath = generateOutputFilename(outputFile, outputDir)
    
    if (response.data[0].b64_json) {
      saveBase64Image(response.data[0].b64_json, outputPath)
      console.log(`💾 Saved edited image to: ${outputPath}`)
    } else if (response.data[0].url) {
      console.log('📥 Downloading edited image from URL...')
      const editedImageBuffer = await fetchImageFromUrl(response.data[0].url)
      saveBase64Image(editedImageBuffer.toString('base64'), outputPath)
      console.log(`💾 Saved edited image to: ${outputPath}`)
    } else {
      throw new Error('Unexpected response format from OpenAI API')
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
    'url-only': false,
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
      
      if (key === 'url-only' && !value) {
        parsed['url-only'] = true
      } else if (key in parsed) {
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
  --url-only          Return only the URL without downloading (optional)
  -h, --help          Show this help message

Examples:
  # Edit from URL
  npm run edit -- --url="https://example.com/image.jpg" --prompt="Add a sunset background"
  
  # Edit local file
  npm run edit -- --url="./photo.png" --prompt="Make it look vintage"
  npm run edit -- --url="/path/to/image.jpg" --prompt="Add a blue sky" --output="sky.png"
  
  # Save to specific directory
  npm run edit -- --url="image.jpg" --prompt="Add effects" --output-dir="./edited"
  
  # Get URL only (don't download)
  npm run edit -- --url="image.jpg" --prompt="Add effects" --url-only
`)
    process.exit(values.help ? 0 : 1)
  }
  
  if (values.prompt.length > 32000) {
    console.error('❌ Error: Prompt exceeds maximum length of 32000 characters')
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
    urlOnly: values['url-only']
  })
}

main().catch(console.error)