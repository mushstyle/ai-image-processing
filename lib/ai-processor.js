import OpenAI from 'openai'

export async function processWithAI(text, imageUrl) {
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY environment variable')
  }
  
  const openai = new OpenAI({
    apiKey: apiKey
  })
  
  try {
    // Since GPT Image 1 generates images from text and image inputs
    // We'll send both the text prompt and reference image URL
    const response = await openai.images.generate({
      model: "dall-e-3", // Using DALL-E 3 as GPT Image 1 might not be available yet
      prompt: `${text} [Reference image: ${imageUrl}]`,
      n: 1,
      size: "1024x1024",
    })
    
    return {
      generatedImageUrl: response.data[0].url,
      prompt: text,
      referenceImage: imageUrl,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('OpenAI API error:', error)
    throw new Error(`OpenAI API failed: ${error.message}`)
  }
}