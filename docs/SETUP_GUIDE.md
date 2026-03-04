# Setup Guide: Hybrid RAG Chatbot

This guide explains how to deploy the Hybrid RAG Chatbot entirely within Vercel's free tier, using external cloud APIs to bypass execution limits and heavy local hardware requirements.

## 1. Prerequisites 

You will need accounts on the following platforms:
1.  **Vercel** (for Next.js deployment)
2.  **Google Cloud** (for Google Vision API)
3.  **HuggingFace** (for text embeddings)
4.  **Upstash** (for Serverless Vector Database)
5.  **Groq** (for fast, free LLM inference)
6.  **SerpAPI** (for live web search context)

## 2. API Key Generation

### OCR.Space API (for Image Text Extraction)
1. Go to [ocr.space/OCRAPI](https://ocr.space/OCRAPI).
2. Click **Register for free OCR API Key**.
3. Follow the instructions to receive your key via email.
4. The OCR.Space free tier provides 25,000 requests per month without requiring a credit card or billing.
- Save as `OCR_SPACE_API_KEY`.

### HuggingFace Inference
1. Create a [HuggingFace](https://huggingface.co/) account.
2. Go to your Profile -> **Settings** -> **Access Tokens**.
3. Create a new token with at least `read` privileges to access public pipelines.
- Save as `HF_API_TOKEN`.

### Upstash Vector DB
1. Create an [Upstash](https://upstash.com/) account.
2. Click **Create Vector Index**.
3. Set **Dimensions** to `384` (to match `sentence-transformers/all-MiniLM-L6-v2`).
4. Set metric to **Cosine**.
5. Once created, scroll to the **REST API** section to find your `REST_URL` and `REST_TOKEN`.
- Save as `UPSTASH_VECTOR_REST_URL` and `UPSTASH_VECTOR_REST_TOKEN`.

### Groq LLM
1. Go to [Groq Console](https://console.groq.com/).
2. Navigate to **API Keys** and click **Create API Key**.
- Save as `GROQ_API_KEY`.

### SerpAPI
1. Create a free account at [SerpAPI](https://serpapi.com/).
2. Copy your Private API Key from the dashboard.
- Save as `SERPAPI_API_KEY`.

## 3. Local Setup

1. Copy `.env.example` to `.env` or `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Paste all your generated API keys into `.env.local`.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run locally:
   ```bash
   npm run dev
   ```

## 4. Vercel Deployment

1. Initialize a Git repository and push this to GitHub.
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```
2. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New -> Project**.
3. Import your repository.
4. Open the **Environment Variables** section and paste your keys from `.env.local` exactly as they appear.
5. Click **Deploy**.

## Architecture Highlights
- **No Python or heavy ML bundles** running on Vercel; everything uses standard REST fetch.
- Streamlined `llama3-8b-8192` model runs inference to stream within ~1-2 seconds, bypassing the 10-second timeout.
