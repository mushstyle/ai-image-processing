# Pricing Optimization for Image Editing

## Key Insight: Output is Always 1024×1024

**Important**: The gpt-image-1 model always returns 1024×1024 images regardless of input size. This means:
- Sending larger images costs more tokens but provides no quality benefit
- The `--optimize-cost` flag can dramatically reduce costs with no impact on output quality
- Input images are only used for style/content reference, not to determine output dimensions

## Pricing Formula

The cost for image editing with gpt-image-1 is calculated as:

```
Cost = (Number of Tokens / 1,000,000) × $5.00
```

Where:
- **Token Price**: $5.00 per 1 million tokens
- **Tokens per Image**: Based on **input** image dimensions (see below)
- **Output**: Always 1024×1024 regardless of input

### Example Calculations
- 765 tokens = 765 ÷ 1,000,000 × $5.00 = **$0.0038**
- 1,105 tokens = 1,105 ÷ 1,000,000 × $5.00 = **$0.0055**
- 1,615 tokens = 1,615 ÷ 1,000,000 × $5.00 = **$0.0081**

## How OpenAI Calculates Image Tokens

OpenAI's GPT-Vision models (including gpt-image-1) calculate tokens based on image dimensions:

1. **Image Scaling**: First, images are scaled to fit within 2048×2048 pixels
2. **Further Scaling**: If the shortest side is still > 768px, the image is scaled again
3. **Tile Counting**: The final image is divided into 512×512 pixel tiles
4. **Token Formula**: `85 + (170 × number_of_tiles)`

## Cost Optimization Strategy

### The Problem
Images are billed based on the number of 512×512 tiles they occupy. A 1023×1023 image uses 4 tiles (same as 1024×1024), but a 1025×1025 image uses 9 tiles - over 2x the cost!

### The Solution: Pre-resize to Tile Boundaries

Since gpt-image-1 always outputs 1024×1024 images, you can aggressively optimize input sizes without affecting output quality. By resizing images to multiples of 512 pixels before sending to OpenAI, you can significantly reduce costs:

| Original Size | Tiles | Tokens | Cost | Optimized Size | Tiles | Tokens | Cost | Savings |
|--------------|-------|--------|------|----------------|-------|--------|------|---------|
| 1000×1000 | 4 | 765 | $0.0038 | 1024×1024 | 4 | 765 | $0.0038 | 0% |
| 1025×1025 | 9 | 1,615 | $0.0081 | 1024×1024 | 4 | 765 | $0.0038 | 53% |
| 1500×1000 | 6 | 1,105 | $0.0055 | 1536×1024 | 6 | 1,105 | $0.0055 | 0% |
| 1537×1000 | 8 | 1,445 | $0.0072 | 1536×1024 | 6 | 1,105 | $0.0055 | 24% |

## Real-World Example

A 742×628 image:
- **Without optimization**: 2×2 = 4 tiles = 765 tokens = $0.0038
- **With optimization** (resized to ~512×433): 1×1 = 1 tile = 255 tokens = $0.0013
- **Savings**: 67% cost reduction, same 1024×1024 output!

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