import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { basename, resolve, dirname } from 'path'
import sharp from 'sharp'

function detectImageType(buffer) {
  // Check magic bytes for common image formats
  const signatures = {
    png: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
    jpg: [0xFF, 0xD8, 0xFF],
    gif: [0x47, 0x49, 0x46],
    webp: [0x52, 0x49, 0x46, 0x46], // RIFF header, need to check WEBP later
    bmp: [0x42, 0x4D]
  }
  
  if (buffer.length < 12) {
    return null
  }
  
  // Check PNG
  if (signatures.png.every((byte, i) => buffer[i] === byte)) {
    return 'image/png'
  }
  
  // Check JPEG
  if (signatures.jpg.every((byte, i) => buffer[i] === byte)) {
    return 'image/jpeg'
  }
  
  // Check GIF
  if (signatures.gif.every((byte, i) => buffer[i] === byte)) {
    return 'image/gif'
  }
  
  // Check WebP (RIFF....WEBP)
  if (signatures.webp.every((byte, i) => buffer[i] === byte) && 
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return 'image/webp'
  }
  
  // Check BMP
  if (signatures.bmp.every((byte, i) => buffer[i] === byte)) {
    return 'image/bmp'
  }
  
  return null
}

export async function fetchImageFromUrl(url) {
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
    }
    
    const buffer = Buffer.from(await response.arrayBuffer())
    
    if (buffer.length > 50 * 1024 * 1024) {
      throw new Error('Image size exceeds 50MB limit')
    }
    
    // Check content-type header first
    const contentType = response.headers.get('content-type')
    const isImageByHeader = contentType && contentType.startsWith('image/')
    
    // If no valid content-type, check the actual file content
    if (!isImageByHeader) {
      const detectedType = detectImageType(buffer)
      if (!detectedType) {
        throw new Error('URL does not point to a valid image file (checked both headers and file content)')
      }
      console.log(`⚠️  Warning: Server returned incorrect content-type. Detected ${detectedType} from file content.`)
    }
    
    return buffer
  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error(`Failed to download image from URL: ${error.message}`)
    }
    throw error
  }
}

export function generateOutputFilename(customName = null, outputDir = null) {
  // If customName is an absolute path, use it directly
  if (customName && (customName.startsWith('/') || customName.includes(':'))) {
    return customName
  }
  
  let filename
  
  if (customName) {
    filename = customName
  } else {
    const now = new Date()
    const timestamp = now.toISOString()
      .replace(/[:.]/g, '')
      .replace('T', '_')
      .slice(0, -1)
    
    filename = `edited_${timestamp}.png`
  }
  
  // Default to outputs/ directory if no outputDir specified
  const directory = outputDir || 'outputs'
  return resolve(directory, filename)
}

export function saveBase64Image(base64Data, outputPath) {
  const buffer = Buffer.from(base64Data, 'base64')
  
  // Create directory if it doesn't exist
  const dir = dirname(outputPath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  
  writeFileSync(outputPath, buffer)
  return outputPath
}

export async function toFile(buffer, filename, options = {}) {
  const blob = new Blob([buffer], { type: options.type || 'image/png' })
  
  const file = {
    stream: () => blob.stream(),
    size: blob.size,
    type: blob.type,
    name: filename,
    lastModified: Date.now(),
    [Symbol.toStringTag]: 'File',
    arrayBuffer: () => blob.arrayBuffer(),
    text: () => blob.text(),
    slice: (start, end, contentType) => blob.slice(start, end, contentType)
  }
  
  return file
}

export function isLocalFile(path) {
  try {
    new URL(path)
    return false
  } catch {
    return true
  }
}

export function readLocalImage(filePath) {
  const resolvedPath = resolve(filePath)
  
  if (!existsSync(resolvedPath)) {
    throw new Error(`File not found: ${filePath}`)
  }
  
  const buffer = readFileSync(resolvedPath)
  
  if (buffer.length > 50 * 1024 * 1024) {
    throw new Error('Image size exceeds 50MB limit')
  }
  
  const ext = filePath.toLowerCase().split('.').pop()
  const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']
  
  if (!validExtensions.includes(ext)) {
    throw new Error(`Unsupported file type: .${ext}`)
  }
  
  return buffer
}

export async function getImageDimensions(buffer) {
  try {
    const metadata = await sharp(buffer).metadata()
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: buffer.length
    }
  } catch (error) {
    throw new Error(`Failed to get image dimensions: ${error.message}`)
  }
}

export async function optimizeImageForTiling(buffer) {
  const { width, height } = await sharp(buffer).metadata()
  
  // Calculate current tile usage
  const widthTiles = Math.ceil(width / 512)
  const heightTiles = Math.ceil(height / 512)
  const originalTiles = widthTiles * heightTiles
  
  
  // Try different optimization strategies
  const strategies = []
  
  // Strategy 1: Round down to tile boundaries (slight downscale)
  if (width > 512 || height > 512) {
    const downWidth = Math.floor(width / 512) * 512 || 512
    const downHeight = Math.floor(height / 512) * 512 || 512
    const downTiles = Math.ceil(downWidth / 512) * Math.ceil(downHeight / 512)
    
    
    if (downTiles < originalTiles && downWidth >= width * 0.65 && downHeight >= height * 0.65) {
      strategies.push({
        width: downWidth,
        height: downHeight,
        tiles: downTiles,
        scaling: Math.min(downWidth / width, downHeight / height)
      })
    }
  }
  
  // Strategy 2: Maintain aspect ratio, try different tile configurations
  const aspectRatio = width / height
  
  // Try all possible tile combinations that save tiles
  for (let wTiles = 1; wTiles <= Math.min(widthTiles, 4); wTiles++) {
    for (let hTiles = 1; hTiles <= Math.min(heightTiles, 4); hTiles++) {
      const totalTiles = wTiles * hTiles
      if (totalTiles >= originalTiles) continue
      
      // Try fitting into this tile configuration
      const maxWidth = wTiles * 512
      const maxHeight = hTiles * 512
      
      let newWidth, newHeight
      
      // Scale to fit within the tile bounds while maintaining aspect ratio
      if (width / maxWidth > height / maxHeight) {
        // Width is the limiting factor
        newWidth = maxWidth
        newHeight = Math.round(maxWidth / aspectRatio)
      } else {
        // Height is the limiting factor
        newHeight = maxHeight
        newWidth = Math.round(maxHeight * aspectRatio)
      }
      
      // Verify this actually fits in the tiles we allocated
      const actualWTiles = Math.ceil(newWidth / 512)
      const actualHTiles = Math.ceil(newHeight / 512)
      const actualTiles = actualWTiles * actualHTiles
      
      // Only add if it saves tiles and doesn't shrink too much
      if (actualTiles < originalTiles && 
          newWidth >= width * 0.65 && 
          newHeight >= height * 0.65) {
        strategies.push({
          width: newWidth,
          height: newHeight,
          tiles: actualTiles,
          scaling: Math.min(newWidth / width, newHeight / height)
        })
      }
    }
  }
  
  // Pick the best strategy (most tiles saved with least scaling)
  if (strategies.length === 0) {
    return {
      buffer,
      resized: false,
      originalDimensions: { width, height },
      tiles: originalTiles
    }
  }
  
  // Sort by tiles (ascending) then by scaling (descending)
  strategies.sort((a, b) => {
    if (a.tiles !== b.tiles) return a.tiles - b.tiles
    return b.scaling - a.scaling
  })
  
  const best = strategies[0]
  
  // Resize the image maintaining aspect ratio
  const resizedBuffer = await sharp(buffer)
    .resize(best.width, best.height, {
      fit: 'inside',
      withoutEnlargement: true,
      kernel: 'lanczos3'
    })
    .toBuffer()
  
  return {
    buffer: resizedBuffer,
    resized: true,
    originalDimensions: { width, height },
    newDimensions: { width: best.width, height: best.height },
    originalTiles: originalTiles,
    optimizedTiles: best.tiles,
    tileSavings: originalTiles - best.tiles
  }
}