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

## Limitations

- Max file size: 50MB
- Max prompt length: 32,000 characters
- Supported formats: JPG, PNG, GIF, WebP, BMP

## Notes

- Output directories are created automatically if they don't exist
- OpenAI may revise your prompt for better results
- gpt-image-1 always returns base64-encoded images (not URLs)