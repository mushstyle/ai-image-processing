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

async function editImage(imageUrl, prompt, outputFile = null) {
  try {
    console.log('📥 Downloading image from URL...')
    const imageBuffer = await fetchImageFromUrl(imageUrl)
    console.log('✅ Image downloaded successfully')
    
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
    
    const outputPath = generateOutputFilename(outputFile)
    
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
    
    if (response.data[0].revised_prompt) {
      console.log(`📝 Revised prompt: ${response.data[0].revised_prompt}`)
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

async function main() {
  const { values } = parseArgs({
    options: {
      url: {
        type: 'string',
        short: 'u'
      },
      prompt: {
        type: 'string',
        short: 'p'
      },
      output: {
        type: 'string',
        short: 'o'
      },
      help: {
        type: 'boolean',
        short: 'h'
      }
    }
  })
  
  if (values.help || !values.url || !values.prompt) {
    console.log(`
AI Image Editor - Edit images using OpenAI's gpt-image-1 model

Usage: npm run edit -- --url <image-url> --prompt <edit-prompt> [options]

Options:
  -u, --url      URL of the source image to edit (required)
  -p, --prompt   Text description of desired edits (required, max 32000 chars)
  -o, --output   Custom output filename (optional)
  -h, --help     Show this help message

Examples:
  npm run edit -- --url "https://example.com/image.jpg" --prompt "Add a sunset background"
  npm run edit -- -u "https://example.com/photo.png" -p "Make it look vintage" -o "vintage.png"
`)
    process.exit(values.help ? 0 : 1)
  }
  
  if (values.prompt.length > 32000) {
    console.error('❌ Error: Prompt exceeds maximum length of 32000 characters')
    process.exit(1)
  }
  
  try {
    new URL(values.url)
  } catch {
    console.error('❌ Error: Invalid URL format')
    process.exit(1)
  }
  
  await editImage(values.url, values.prompt, values.output)
}

main().catch(console.error)