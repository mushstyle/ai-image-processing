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
| `--optimize-cost` | Resize image to tile boundaries to reduce costs |
| `--quality=<level>` | Image quality: `auto`, `high`, `medium`, or `low` (default: `auto`) |
| `--detail=<level>` | Token detail level: `high` or `low` (default: `high`) |
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

**Cost optimization:**
```bash
npm run edit -- --url="photo.jpg" --prompt="enhance colors" --optimize-cost
# Automatically resizes to tile boundaries (multiples of 512px) to reduce API costs
```

**High quality output:**
```bash
npm run edit -- --url="photo.jpg" --prompt="add details" --quality=high
# Uses high quality setting for better results (may cost more)
```

**Low detail mode (cheaper):**
```bash
npm run edit -- --url="photo.jpg" --prompt="basic color adjustment" --detail=low
# Uses low detail tokenization (85 tokens per tile instead of 255)
```

## Limitations

- Max file size: 50MB
- Max prompt length: 32,000 characters
- Supported formats: JPG, PNG, GIF, WebP, BMP

## Notes

- Output directories are created automatically if they don't exist
- OpenAI may revise your prompt for better results
- gpt-image-1 always returns base64-encoded images (not URLs)
- The `--optimize-cost` flag resizes images to 512px tile boundaries to minimize token usage
- Token costs are calculated and displayed before API calls
- Quality levels: `auto` (default), `high` (best quality), `medium`, `low` (fastest/cheapest)
- Detail levels affect token cost: `high` = 255 tokens/tile, `low` = 85 tokens/tile (66% cheaper)

## Cost Information

- **Pricing**: $5.00 per 1 million tokens
- **Token calculation**: 85 + (170 × number of 512×512 tiles)
- See [PRICING.md](PRICING.md) for detailed cost optimization strategies