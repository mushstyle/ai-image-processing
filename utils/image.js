import { writeFileSync } from 'fs'
import { basename } from 'path'

export async function fetchImageFromUrl(url) {
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
    }
    
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error('URL does not point to an image')
    }
    
    const buffer = Buffer.from(await response.arrayBuffer())
    
    if (buffer.length > 50 * 1024 * 1024) {
      throw new Error('Image size exceeds 50MB limit')
    }
    
    return buffer
  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error(`Failed to download image from URL: ${error.message}`)
    }
    throw error
  }
}

export function generateOutputFilename(customName = null) {
  if (customName) {
    return customName
  }
  
  const now = new Date()
  const timestamp = now.toISOString()
    .replace(/[:.]/g, '')
    .replace('T', '_')
    .slice(0, -1)
  
  return `edited_${timestamp}.png`
}

export function saveBase64Image(base64Data, outputPath) {
  const buffer = Buffer.from(base64Data, 'base64')
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