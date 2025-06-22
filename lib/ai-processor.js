import OpenAI from 'openai'

export async function validateAPIKey() {
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    console.error('❌ Error: OPENAI_API_KEY environment variable is missing')
    process.exit(1)
  }
  
  if (apiKey === 'your-openai-api-key-here') {
    console.error('❌ Error: Please replace the placeholder API key with your actual OpenAI API key')
    process.exit(1)
  }
  
  const openai = new OpenAI({ apiKey })
  
  try {
    // Test the API key by making a simple request
    await openai.models.list()
    console.log('✅ OpenAI API key validated successfully')
  } catch (error) {
    console.error('❌ Error: Invalid OpenAI API key')
    console.error('Details:', error.message)
    process.exit(1)
  }
}

export async function processWithAI(text, imageUrl) {
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY environment variable')
  }
  
  const openai = new OpenAI({
    apiKey: apiKey
  })
  
  try {
    // GPT Image 1 is a multimodal model that accepts both text and image inputs
    // Based on the search results, it generates images from text prompts
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: `${text} based on reference image: ${imageUrl}`,
      n: 1,
      size: "1024x1024" // Can go up to 4096x4096
    })
    
    // Log response structure without the actual base64 data
    const responseInfo = {
      hasUrl: !!response.data[0].url,
      hasBase64: !!response.data[0].b64_json,
      revised_prompt: response.data[0].revised_prompt
    }
    console.log('API Response structure:', responseInfo)
    
    // Check if we got base64 data
    if (response.data[0].b64_json) {
      return {
        imageBase64: response.data[0].b64_json,
        prompt: text,
        referenceImage: imageUrl,
        timestamp: new Date().toISOString()
      }
    } else if (response.data[0].url) {
      return {
        generatedImageUrl: response.data[0].url,
        prompt: text,
        referenceImage: imageUrl,
        timestamp: new Date().toISOString()
      }
    } else {
      throw new Error('Unexpected response format from OpenAI API')
    }
  } catch (error) {
    console.error('OpenAI API error:', error)
    throw new Error(`OpenAI API failed: ${error.message}`)
  }
}