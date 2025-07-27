# Image Edit Script Plan

## Overview
Create a Node.js script that accepts an image URL and a prompt, then uses OpenAI's gpt-image-1 model to edit the image based on the prompt.

## Script Parameters
1. **Image URL** - URL of the source image to edit
2. **Prompt** - Text description of desired edits (max 32000 chars for gpt-image-1)

## Implementation Steps

### 1. Setup & Dependencies
- Use existing OpenAI SDK (already in project)
- Add dependencies for URL fetching if needed (e.g., axios or fetch)
- Handle command line arguments parsing

### 2. Core Functionality
```javascript
// Pseudo-code structure
async function editImage(imageUrl, prompt) {
  // 1. Fetch image from URL
  const imageBuffer = await fetchImageFromUrl(imageUrl);
  
  // 2. Convert to OpenAI file format
  const imageFile = await toFile(imageBuffer, 'image.png', { type: 'image/png' });
  
  // 3. Call OpenAI edit API
  const response = await client.images.edit({
    model: 'gpt-image-1',
    image: imageFile,
    prompt: prompt,
    response_format: 'b64_json' // Use base64 for direct saving
  });
  
  // 4. Save result
  const outputPath = generateOutputFilename();
  saveBase64Image(response.data[0].b64_json, outputPath);
  
  return outputPath;
}
```

### 3. Error Handling
- Validate URL format
- Check image size constraints (< 50MB for gpt-image-1)
- Handle network errors
- Validate prompt length (< 32000 chars)
- Handle API errors gracefully

### 4. Output Options
- Default: Save to timestamped file (e.g., `edited_2024MMDD_HHMMSS.png`)
- Optional: Allow custom output filename via CLI arg
- Log the output path for user reference

### 5. CLI Interface
```bash
# Usage examples
node edit-image.js --url "https://example.com/image.jpg" --prompt "Add a sunset background"
node edit-image.js -u "https://example.com/image.jpg" -p "Make it look vintage" -o "vintage-edit.png"
```

### 6. Optional Enhancements
- Support for additional parameters:
  - `--quality` (high/medium/low/auto)
  - `--output-format` (png/jpeg/webp)
  - `--compression` (0-100)
  - `--fidelity` (high/low) for style matching
- Batch processing multiple URLs
- Progress indicators for large images

## File Structure
```
/
├── edit-image.js       # Main script
├── utils/
│   ├── image.js       # Image fetching/processing utilities
│   └── openai.js      # OpenAI client setup
└── plans/
    └── image-edit-script.md  # This file
```

## Security Considerations
- Validate URLs to prevent SSRF attacks
- Implement rate limiting for API calls
- Never log or expose API keys
- Sanitize file paths for output

## Testing Strategy
1. Test with various image formats (PNG, JPG, WebP)
2. Test with different image sizes
3. Test error cases (invalid URLs, oversized images)
4. Test various prompt complexities
5. Verify output quality settings work correctly