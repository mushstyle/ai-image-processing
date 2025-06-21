# AI Image Processing API

Simple Express server that accepts text + image URL and processes them via AI.

## Setup
```bash
npm install
cp .env.example .env  # Edit with your API credentials
```

## Run
```bash
npm run dev  # Development with auto-reload
npm start    # Production
```

## API
POST `/api/process`
```json
{
  "text": "your text",
  "imageUrl": "https://example.com/image.jpg"
}
```

## Environment Variables
- `OPENAI_API_KEY` - Your OpenAI API key
- `PORT` - Server port (default: 3000)