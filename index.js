import express from 'express'
import { processWithAI } from './lib/ai-processor.js'

const app = express()
app.use(express.json())

app.post('/api/process', async (req, res) => {
  try {
    const { text, imageUrl } = req.body

    if (!text || !imageUrl) {
      return res.status(400).json({ error: 'Both text and imageUrl are required' })
    }

    const result = await processWithAI(text, imageUrl)
    res.json({ result })

  } catch (error) {
    console.error('Processing error:', error)
    res.status(500).json({ error: 'Processing failed' })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})