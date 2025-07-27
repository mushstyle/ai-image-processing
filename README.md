# AI Image Processing

A Node.js tool for editing images using OpenAI's gpt-image-1 model.

## Features

- Edit images from URLs or local files
- Uses OpenAI's powerful gpt-image-1 model
- Saves edited images with timestamped filenames
- Support for custom output filenames

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your OpenAI API key:
   ```
   OPENAI_API_KEY=your-api-key-here
   ```

## Usage

### Edit Image from URL

```bash
npm run edit -- --url="https://example.com/image.jpg" --prompt="Add a sunset background"
```

### Edit Local Image

```bash
npm run edit -- --url="./photo.png" --prompt="Make it look vintage"
npm run edit -- --url="/path/to/image.jpg" --prompt="Add a blue sky" --output="sky.png"
```

### Options

- `--url=<path>` - Path to local image file or URL of source image (required)
- `--prompt=<text>` - Text description of desired edits (required, max 32000 chars)
- `--output=<filename>` - Custom output filename (optional)
- `--output-dir=<dir>` - Directory to save the output file (optional)
- `--url-only` - Return only the URL without downloading (optional)
- `-h, --help` - Show help message

## Examples

```bash
# Add a green triangle to a shirt
npm run edit -- --url="https://static.zara.net/assets/public/2b9d/d8f6/1f004ccfa87c/90c09a8b0868/01887455915-e1/01887455915-e1.jpg?ts=1751531694673&w=2912" --prompt="add a green triangle to the front of the shirt"

# Edit a local screenshot
npm run edit -- --url="./screenshot.png" --prompt="highlight the button in red"

# Save to specific directory
npm run edit -- --url="image.jpg" --prompt="Add vintage filter" --output-dir="./edited"

# Get URL only (don't download)
npm run edit -- --url="photo.png" --prompt="Remove background" --url-only

# Combine output filename and directory
npm run edit -- --url="photo.jpg" --prompt="Add frame" --output="framed.png" --output-dir="./results"
```

## Supported Image Formats

- JPG/JPEG
- PNG
- GIF
- WebP
- BMP

## Notes

- Maximum image size: 50MB
- Maximum prompt length: 32,000 characters
- Edited images are saved in the current directory with timestamped filenames by default