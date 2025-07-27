# AI Image Processing API

Simple Express server that accepts text + image URL and processes them via AI.

## Setup
```bash
npm install
cp .env.example .env  # Edit with your API credentials
```

## Run
```bash
npm run dev  # Development with auto-reload
npm start    # Production
```

## API
POST `/api/process`
```json
{
  "text": "your text",
  "imageUrl": "https://example.com/image.jpg"
}
```

## Environment Variables
- `OPENAI_API_KEY` - Your OpenAI API key
- `PORT` - Server port (default: 3000)

## GPT-Image-1 Limitations
- **No image analysis**: GPT-Image-1 cannot analyze or modify existing images from URLs
- **Text-only generation**: It only generates new images from text descriptions
- **No direct editing**: Unlike DALL-E 2's edit endpoint, it cannot perform targeted modifications
- **One image per request**: Currently limited to generating a single image per API call
- **URL references ignored**: Including image URLs in prompts doesn't make the model analyze them

For image-to-image transformations, consider:
1. Using GPT-4 Vision to analyze images first, then generate
2. Using DALL-E 2's edit endpoint with actual image uploads
3. Alternative services that support direct image modifications