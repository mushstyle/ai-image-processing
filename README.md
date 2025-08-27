# AI Image Processing

Edit and process images using natural language prompts with OpenAI's gpt-image-1 and Google's Gemini models.

## Quick Start

```bash
npm install

# Set up API keys
echo "OPENAI_API_KEY=your-openai-key-here" > .env
echo "GEMINI_API_KEY=your-gemini-key-here" >> .env

# OpenAI editing
npm run edit -- --url="image.jpg" --prompt="remove the background"

# Gemini processing
npm run gemini-test -- --image="image.jpg" --prompt="extract objects"
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
GEMINI_API_KEY=your-gemini-api-key
```

## Usage

### OpenAI Image Editing

```bash
npm run edit -- --url=<image> --prompt=<instructions> [options]
```

#### Options

| Option | Description |
|--------|-------------|
| `--url=<path>` | Image URL or local file path **(required)** |
| `--prompt=<text>` | Edit instructions **(required)** |
| `--output=<name>` | Custom filename (default: `outputs/edited_[timestamp].png`) |
| `--output-dir=<dir>` | Save directory (default: `outputs/`) |
| `--quality=<level>` | Image quality: `auto`, `high`, `medium`, or `low` (default: `auto`) |
| `--size=<dimensions>` | Output size: `1024x1024`, `1536x1024`, or `1024x1536` (default: `1024x1024`) |
| `--help` | Show help |

#### Examples

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

### Gemini Image Processing

```bash
npm run gemini-test -- --image=<path> [--image=<path>...] --prompt=<instructions> [options]
```

Gemini can handle multiple input images and generate multiple output images, making it ideal for:
- Object extraction from images
- Style transfer between images
- Multi-image composition
- Batch processing

#### Options

| Option | Description |
|--------|-------------|
| `--image=<path>` | Image URL or local file path (can specify multiple) **(required)** |
| `--prompt=<text>` | Processing instructions **(required)** |
| `--output-dir=<dir>` | Directory to save output files (default: `outputs/`) |
| `--output-prefix=<prefix>` | Prefix for output filenames (default: `gemini_out_`) |
| `--help` | Show help |

#### Examples

**Single image processing:**
```bash
npm run gemini-test -- --image="photo.jpg" --prompt="Extract all objects separately"
# Outputs: outputs/gemini_out_1.png, outputs/gemini_out_2.png, etc.
```

**Extract clothing items:**
```bash
npm run gemini-test -- --image="fashion.jpg" --prompt="Extract all clothes in this image into 1 image, with each clothing item separate from the others"
```

**Multiple images (style transfer):**
```bash
npm run gemini-test -- --image="room.jpg" --image="furniture-style.png" --prompt="Place furniture styled like the second image into the first room, match lighting and perspective"
```

**From URL:**
```bash
npm run gemini-test -- --image="https://example.com/photo.jpg" --prompt="Remove background and add studio lighting"
```

**Custom output location:**
```bash
npm run gemini-test -- --image="photo.jpg" --prompt="Make 3 variations" --output-dir="/Users/you/Desktop/" --output-prefix="variation_"
# Saves to: /Users/you/Desktop/variation_1.png, variation_2.png, etc.
```

**Compositing multiple images:**
```bash
npm run gemini-test -- --image="background.jpg" --image="subject.png" --image="style.jpg" --prompt="Composite the subject from image 2 onto the background from image 1, using the art style from image 3"
```

#### Key Differences from OpenAI

- **Multiple inputs**: Gemini can process multiple input images in a single request
- **Multiple outputs**: Can generate multiple variations or extracted objects
- **Flexible prompting**: Excels at object extraction, style transfer, and creative composition
- **Output format**: Always outputs as PNG files with sequential numbering


## Limitations

### Both Models
- Max file size: 50MB
- Supported formats: JPG, PNG, GIF, WebP, BMP

### OpenAI
- Max prompt length: 32,000 characters
- Single input image only
- Returns single output image

### Gemini
- Requires `GEMINI_API_KEY` from Google AI Studio
- Model: gemini-2.5-flash-image-preview
- Multiple inputs and outputs supported

## Pricing

### OpenAI (gpt-image-1)
The cost depends on two main factors:

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

### Gemini
Gemini pricing is based on token usage (input and output). Check Google AI Studio for current pricing details.

## Notes

- Output directories are created automatically if they don't exist
- Both models support local files and URLs as input
- Environment variables are loaded using Node.js 20+ `--env-file` flag (no dotenv needed)

### OpenAI Notes
- May revise your prompt for better results
- Always returns base64-encoded images (not URLs)
- Quality levels: `auto` (default), `high` (best quality), `medium`, `low` (fastest/cheapest)

### Gemini Notes  
- Can return multiple images from a single request
- Excellent for object extraction and creative composition
- All outputs are PNG format
- Temporary files are automatically cleaned up after processing

