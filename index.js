import express from 'express'
import { processWithAI, validateAPIKey } from './lib/ai-processor.js'

// Validate API key on startup
await validateAPIKey()

const app = express()
app.use(express.json())

app.post('/api/process', async (req, res) => {
  try {
    const { text, imageUrl, outputFormat = 'json' } = req.body

    if (!text || !imageUrl) {
      return res.status(400).json({ error: 'Both text and imageUrl are required' })
    }

    console.log('📸 Processing request:', { text: text.substring(0, 50) + '...', imageUrl: imageUrl.substring(0, 50) + '...' })
    
    const result = await processWithAI(text, imageUrl)
    
    // If base64 data is available and user wants binary output
    if (result.imageBase64 && outputFormat === 'binary') {
      const imageBuffer = Buffer.from(result.imageBase64, 'base64')
      res.set('Content-Type', 'image/png')
      res.set('Content-Disposition', 'attachment; filename=generated.png')
      res.send(imageBuffer)
    } else {
      res.json({ result })
    }

  } catch (error) {
    console.error('Processing error:', error)
    res.status(500).json({ error: 'Processing failed' })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})