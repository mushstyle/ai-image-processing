# Pricing Optimization for Image Editing

## Key Insight: Output is Always 1024×1024

**Important**: The gpt-image-1 model always returns 1024×1024 images regardless of input size. This means:
- Sending larger images costs more tokens but provides no quality benefit
- The `--optimize-cost` flag can dramatically reduce costs with no impact on output quality
- Input images are only used for style/content reference, not to determine output dimensions

## Pricing Formula

The total cost for image editing with gpt-image-1 includes both input and output tokens:

```
Total Cost = (Prompt Tokens + Completion Tokens) / 1,000,000 × $5.00
```

### Token Breakdown

**Prompt Tokens (Input):**
- **Text tokens**: Your prompt text (typically 10-100 tokens)
- **Image tokens**: Calculated based on image size and detail level
  - `detail:"high"` (default): (85 + 170) × number of tiles = 255 × tiles
  - `detail:"low"`: 85 × number of tiles

**Completion Tokens (Output):**
- Tokens used by the model to process and generate the response
- Typically 50-200 tokens for image editing
- Shown in `response.usage.completion_tokens`

### Example Cost Calculation
For a 742×628 image (2×2 = 4 tiles) with high detail:
- Text prompt: ~20 tokens
- Image: 255 × 4 = 1,020 tokens  
- Completion: ~100 tokens
- **Total**: 1,140 tokens = $0.0057

## How OpenAI Calculates Image Tokens

OpenAI's GPT-Vision models (including gpt-image-1) calculate image tokens based on detail level:

### High Detail Mode (default)
1. **Image Scaling**: First, images are scaled to fit within 2048×2048 pixels
2. **Further Scaling**: If the shortest side is still > 768px, the image is scaled again
3. **Tile Counting**: The final image is divided into 512×512 pixel tiles
4. **Token Formula**: `(85 + 170) × tiles = 255 × tiles`

### Low Detail Mode
1. **Same scaling and tiling process** as high detail
2. **Token Formula**: `85 × tiles`
3. Faster processing but less accurate understanding
4. Good for simple edits where fine details aren't critical

**Note**: Currently our script always uses high detail mode. Low detail mode could be added as a future optimization.

## Cost Optimization Strategy

### The Problem
Images are billed based on the number of 512×512 tiles they occupy. A 1023×1023 image uses 4 tiles (same as 1024×1024), but a 1025×1025 image uses 9 tiles - over 2x the cost!

### The Solution: Pre-resize to Tile Boundaries

Since gpt-image-1 always outputs 1024×1024 images, you can aggressively optimize input sizes without affecting output quality. By resizing images to multiples of 512 pixels before sending to OpenAI, you can significantly reduce costs:

| Original Size | Tiles | Image Tokens (High) | Total Cost* | Optimized Size | Tiles | Image Tokens (High) | Total Cost* | Savings |
|--------------|-------|---------------------|-------------|----------------|-------|---------------------|-------------|---------|
| 1000×1000 | 4 | 1,020 | $0.0061 | 1024×1024 | 4 | 1,020 | $0.0061 | 0% |
| 1025×1025 | 9 | 2,295 | $0.0127 | 1024×1024 | 4 | 1,020 | $0.0061 | 52% |
| 1500×1000 | 6 | 1,530 | $0.0091 | 1536×1024 | 6 | 1,530 | $0.0091 | 0% |
| 1537×1000 | 8 | 2,040 | $0.0117 | 1536×1024 | 6 | 1,530 | $0.0091 | 22% |

*Total cost includes ~100 prompt text tokens + ~100 completion tokens

## Real-World Example

A 742×628 image with a 50-word prompt:
- **Without optimization**: 
  - Image: 2×2 = 4 tiles = 1,020 tokens (high detail)
  - Text prompt: ~75 tokens
  - Completion: ~100 tokens
  - Total: 1,195 tokens = $0.0060
- **With optimization** (resized to ~512×433): 
  - Image: 1×1 = 1 tile = 255 tokens (high detail)
  - Text prompt: ~75 tokens
  - Completion: ~100 tokens
  - Total: 430 tokens = $0.0022
- **Savings**: 63% cost reduction, same 1024×1024 output!

## Implementation Recommendations

### 1. Smart Resizing Algorithm
```javascript
function optimizeImageSize(width, height) {
  // Round up to nearest 512 multiple
  const optWidth = Math.ceil(width / 512) * 512
  const optHeight = Math.ceil(height / 512) * 512
  
  // Check if resizing would exceed OpenAI's limits
  if (optWidth > 2048 || optHeight > 2048) {
    // Scale down proportionally to fit within 2048×2048
    const scale = Math.min(2048 / optWidth, 2048 / optHeight)
    return {
      width: Math.floor(optWidth * scale),
      height: Math.floor(optHeight * scale)
    }
  }
  
  return { width: optWidth, height: optHeight }
}
```

### 2. Quality vs Cost Trade-offs

Since output is always 1024×1024:
- **Input size doesn't affect output resolution** - only style/content reference quality
- **Moderate downscaling** (up to 35%) has minimal impact on AI's understanding
- **Aggressive optimization** can save 50-75% on costs with acceptable results
- **Use `--optimize-cost` flag** to automatically find the best tile configuration

### 3. Best Practices

1. **Always resize just before API call** - Don't save resized versions as originals
2. **Show users the cost difference** - Let them choose between quality and savings
3. **Consider aspect ratios** - Maintain proportions when possible
4. **Set thresholds** - Only resize if it saves at least 1 tile

## Example Savings

For a typical workflow processing 1000 images per month:
- Average image size: 1600×1200
- Without optimization: 8 tiles × 1000 = $0.04 per image = $40/month
- With optimization to 1536×1024: 6 tiles × 1000 = $0.03 per image = $30/month
- **Monthly savings: $10 (25%)**

## Future Considerations

- OpenAI may change their tiling algorithm
- Different models may have different tile sizes
- Consider caching resized images for repeated edits