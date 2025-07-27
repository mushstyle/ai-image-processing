import sharp from 'sharp'

/**
 * Calculate the number of tokens for an image based on OpenAI's GPT-Vision tokenization rules
 * @param {Buffer} imageBuffer - The image data as a Buffer
 * @param {string} detail - The detail level ('low' or 'high')
 * @returns {Promise<{tokens: number, dimensions: {width: number, height: number}, tiles?: {count: number, scaledDimensions?: {width: number, height: number}}}>}
 */
export async function calculateImageTokens(imageBuffer, detail = 'high') {
  // Get image metadata using sharp
  const metadata = await sharp(imageBuffer).metadata()
  const { width, height } = metadata
  
  if (detail === 'low') {
    return {
      tokens: 85,
      dimensions: { width, height }
    }
  }
  
  // High detail calculation
  let scaledWidth = width
  let scaledHeight = height
  
  // First, scale down to fit within 2048x2048 if needed
  if (width > 2048 || height > 2048) {
    const scale = Math.min(2048 / width, 2048 / height)
    scaledWidth = Math.floor(width * scale)
    scaledHeight = Math.floor(height * scale)
  }
  
  // Then, scale down further if the shortest side is > 768
  const shortestSide = Math.min(scaledWidth, scaledHeight)
  if (shortestSide > 768) {
    const scale = 768 / shortestSide
    scaledWidth = Math.floor(scaledWidth * scale)
    scaledHeight = Math.floor(scaledHeight * scale)
  }
  
  // Calculate number of 512x512 tiles
  const tilesX = Math.ceil(scaledWidth / 512)
  const tilesY = Math.ceil(scaledHeight / 512)
  const totalTiles = tilesX * tilesY
  
  // Calculate tokens: base 85 + 170 per tile
  const tokens = 85 + (170 * totalTiles)
  
  return {
    tokens,
    dimensions: { width, height },
    tiles: {
      count: totalTiles,
      scaledDimensions: { width: scaledWidth, height: scaledHeight }
    }
  }
}

/**
 * Calculate the cost based on token usage
 * @param {number} tokens - Number of tokens
 * @param {number} pricePerMillion - Price per 1 million tokens (default: $5 for gpt-image-1)
 * @returns {number} Cost in USD
 */
export function calculateCost(tokens, pricePerMillion = 5) {
  return (tokens / 1_000_000) * pricePerMillion
}

/**
 * Format cost as a USD string
 * @param {number} cost - Cost in USD
 * @returns {string} Formatted cost string
 */
export function formatCost(cost) {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`
  }
  return `$${cost.toFixed(2)}`
}