import OpenAI from 'openai'

let client = null

export function getOpenAIClient() {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      throw new Error('Missing OPENAI_API_KEY environment variable')
    }
    
    if (apiKey === 'your-openai-api-key-here') {
      throw new Error('Please replace the placeholder API key with your actual OpenAI API key')
    }
    
    client = new OpenAI({ apiKey })
  }
  
  return client
}