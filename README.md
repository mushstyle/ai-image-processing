# AI Image Editor

Edit images using natural language prompts with OpenAI's gpt-image-1 model.

## Quick Start

```bash
npm install
echo "OPENAI_API_KEY=your-api-key-here" > .env
npm run edit -- --url="image.jpg" --prompt="remove the background"
```

## Installation

Requires Node.js 18+

```bash
git clone <this-repo>
cd ai-image-processing
npm install
```

Create `.env` file:
```
OPENAI_API_KEY=sk-your-openai-api-key
```

## Usage

```bash
npm run edit -- --url=<image> --prompt=<instructions> [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--url=<path>` | Image URL or local file path **(required)** |
| `--prompt=<text>` | Edit instructions **(required)** |
| `--output=<name>` | Custom filename (default: `outputs/edited_[timestamp].png`) |
| `--output-dir=<dir>` | Save directory (default: `outputs/`) |
| `--quality=<level>` | Image quality: `auto`, `high`, `medium`, or `low` (default: `auto`) |
| `--size=<dimensions>` | Output size: `1024x1024`, `1536x1024`, or `1024x1536` (default: `1024x1024`) |
| `--help` | Show help |

### Examples

**Basic editing:**
```bash
npm run edit -- --url="photo.jpg" --prompt="make it black and white"
# Saves to: outputs/edited_[timestamp].png
```

**From URL:**
```bash
npm run edit -- --url="https://example.com/image.jpg" --prompt="add sunset"
```

**Custom output:**
```bash
npm run edit -- --url="pic.png" --prompt="remove background" --output="transparent.png" --output-dir="./edited"
```

**High quality output:**
```bash
npm run edit -- --url="photo.jpg" --prompt="add details" --quality=high
# Uses high quality setting for better results (may cost more)
```

**Landscape output:**
```bash
npm run edit -- --url="photo.jpg" --prompt="make it cinematic" --size=1536x1024
# Creates a landscape format image (costs more than square)
```


## Limitations

- Max file size: 50MB
- Max prompt length: 32,000 characters
- Supported formats: JPG, PNG, GIF, WebP, BMP

## Pricing

The cost of image editing with gpt-image-1 depends on two main factors:

1. **Quality** - Lower quality settings are cheaper
   - `auto` (default) - Let OpenAI optimize cost/quality
   - `low` - Cheapest option
   - `medium` - Balanced cost/quality
   - `high` - Most expensive, best quality

2. **Output Size** - Smaller outputs cost less
   - `1024x1024` (default) - Cheapest option
   - `1536x1024` or `1024x1536` - More expensive
   - Other sizes may have different costs

**💡 Tip**: The script defaults to `auto` quality and `1024x1024` size for optimal cost-effectiveness.

## Notes

- Output directories are created automatically if they don't exist
- OpenAI may revise your prompt for better results
- gpt-image-1 always returns base64-encoded images (not URLs)
- Quality levels: `auto` (default), `high` (best quality), `medium`, `low` (fastest/cheapest)

