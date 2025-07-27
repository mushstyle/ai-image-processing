import { parseArgs } from 'util'
import { getOpenAIClient } from './utils/openai.js'
import { 
  fetchImageFromUrl, 
  toFile, 
  generateOutputFilename, 
  saveBase64Image,
  isLocalFile,
  readLocalImage,
  getImageDimensions,
  optimizeImageForTiling
} from './utils/image.js'
import { calculateImageTokens, calculateCost, formatCost } from './utils/token-calculator.js'

async function editImage(imagePath, prompt, options = {}) {
  const { outputFile, outputDir, optimizeCost } = options
  
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
    
    // Optimize image if requested
    if (optimizeCost) {
      console.log('🔧 Optimizing image for cost savings...')
      const optimized = await optimizeImageForTiling(imageBuffer)
      
      if (optimized.resized) {
        imageBuffer = optimized.buffer
        console.log(`✂️  Resized from ${optimized.originalDimensions.width}x${optimized.originalDimensions.height} to ${optimized.newDimensions.width}x${optimized.newDimensions.height}`)
        console.log(`💰 Tile savings: ${optimized.originalTiles} → ${optimized.optimizedTiles} tiles (${optimized.tileSavings} tiles saved)`)
      } else {
        console.log('ℹ️  Image already optimally sized')
      }
    }
    
    // Calculate tokens and cost estimate before API call
    console.log('📊 Calculating token usage...')
    const tokenInfo = await calculateImageTokens(imageBuffer, 'high')
    const estimatedCost = calculateCost(tokenInfo.tokens)
    
    console.log(`📐 Image dimensions: ${tokenInfo.dimensions.width}x${tokenInfo.dimensions.height}`)
    if (tokenInfo.tiles) {
      console.log(`🔲 Tiles: ${tokenInfo.tiles.count} (scaled to ${tokenInfo.tiles.scaledDimensions.width}x${tokenInfo.tiles.scaledDimensions.height})`)
    }
    console.log(`🪙 Estimated tokens: ${tokenInfo.tokens.toLocaleString()}`)
    console.log(`💰 Estimated cost: ${formatCost(estimatedCost)}`)
    
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
      size: '1024x1024'
    })
    const duration = (Date.now() - startTime) / 1000
    
    console.log(`✅ Image edited successfully (${duration.toFixed(1)}s)`)
    
    if (response.data[0].revised_prompt) {
      console.log(`📝 Revised prompt: ${response.data[0].revised_prompt}`)
    }
    
    // gpt-image-1 always returns base64 data
    const outputPath = generateOutputFilename(outputFile, outputDir)
    
    if (response.data[0].b64_json) {
      // Check the output image dimensions
      const outputBuffer = Buffer.from(response.data[0].b64_json, 'base64')
      const outputDimensions = await getImageDimensions(outputBuffer)
      console.log(`📏 Output image dimensions: ${outputDimensions.width}x${outputDimensions.height}`)
      
      saveBase64Image(response.data[0].b64_json, outputPath)
      console.log(`💾 Saved edited image to: ${outputPath}`)
      
      // Show final cost summary
      console.log('\n📊 Final Summary:')
      console.log(`  • Tokens used: ${tokenInfo.tokens.toLocaleString()}`)
      console.log(`  • Cost: ${formatCost(estimatedCost)}`)
      console.log(`  • Processing time: ${duration.toFixed(1)}s`)
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
    'optimize-cost': false,
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
  --optimize-cost     Resize image to reduce API costs (optional)
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
    optimizeCost: values['optimize-cost']
  })
}

main().catch(console.error)