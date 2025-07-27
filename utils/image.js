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