# DOA Chatbot

A monolithic Next.js application for querying Delegation of Authority (DOA) information with domain-restricted authentication and ChatGPT-like interface with source citations.

## Features

- **Domain-Restricted Authentication**: Only authorized @cloudextel.com Microsoft accounts can access
- **Email Whitelist**: Access restricted to specific authorized users
- **RAG-Powered Chatbot**: Uses Retrieval Augmented Generation for accurate responses
- **Source Citations**: Every response includes citations with row numbers and approval levels
- **ChatGPT-like Interface**: Modern dark theme UI with conversation history

## Prerequisites

- Node.js 18+ 
- Google API Key for Gemini and Embeddings
- Microsoft Azure AD OAuth credentials for authentication

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Google API
GOOGLE_API_KEY=your_google_api_key_here

# Azure AD
AZURE_AD_CLIENT_ID=your_azure_ad_client_id
AZURE_AD_CLIENT_SECRET=your_azure_ad_client_secret
AZURE_AD_TENANT_ID=your_azure_ad_tenant_id

# NextAuth
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000

# Environment
NODE_ENV=development
ALLOWED_DOMAIN=cloudextel.com

# Allowed Emails (comma-separated, optional - defaults to hardcoded list)
ALLOWED_EMAILS=k.trivedi@cloudextel.com,s.gite@cloudextel.com,...
```

**Getting API Keys:**

- **Google API Key**: [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Azure AD Credentials**: [Azure Portal](https://portal.azure.com/) → Azure Active Directory → App registrations
  - Redirect URI: `http://localhost:3000/api/auth/callback/azure-ad`
- **NEXTAUTH_SECRET**: Generate with `openssl rand -base64 32`

### 3. Process Excel File

```bash
npm run process-doa
```

This creates `data/processed/doa-chunks.json`

### 4. Build Vector Index

```bash
npm run build-index
```

This creates embeddings and builds the searchable index.

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Configuration

The application supports both development and production environments. Switch between them by updating the `.env` file.

### Development Mode

```env
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000
```

**Features:**
- "Continue without Login" button for testing
- Dev bypass authentication (cookie-based)
- Hot reload enabled

### Production Mode

```env
NODE_ENV=production
NEXTAUTH_URL=https://doa.cloud
```

**Features:**
- Dev bypass disabled
- Only Microsoft authentication allowed
- Optimized builds

**Switching Environments:**
1. Update `NODE_ENV` and `NEXTAUTH_URL` in `.env`
2. For production, update Azure AD redirect URI: `https://doa.cloud/api/auth/callback/azure-ad`
3. Restart the server

## Usage

1. Sign in with your authorized @cloudextel.com Microsoft account
2. Ask questions about DOA, approval processes, or company policies
3. View source citations by clicking "Show sources" on any response

## Project Structure

```
├── app/
│   ├── (auth)/
│   │   └── signin/          # Login page
│   ├── api/
│   │   ├── auth/             # NextAuth routes
│   │   ├── chat/              # Chat API endpoint
│   │   └── health/            # Health check endpoint
│   ├── chat/                  # Chat interface
│   └── layout.tsx             # Root layout
├── lib/
│   ├── auth.ts                # NextAuth configuration
│   ├── process-excel.ts       # Excel processing utilities
│   ├── vectorstore.ts         # Vector store management
│   └── chat-chain.ts          # LangChain chat chain
├── scripts/
│   ├── process-doa.ts         # Process Excel file
│   └── build-index.ts         # Build vector index
└── data/
    ├── processed/             # Processed chunks
    └── faiss-index/            # Vector index storage
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_API_KEY` | Google API key for Gemini and embeddings | Yes |
| `AZURE_AD_CLIENT_ID` | Microsoft Azure AD client ID | Yes |
| `AZURE_AD_CLIENT_SECRET` | Microsoft Azure AD client secret | Yes |
| `AZURE_AD_TENANT_ID` | Microsoft Azure AD tenant ID | Yes |
| `NEXTAUTH_SECRET` | Secret for NextAuth session encryption | Yes |
| `NEXTAUTH_URL` | Base URL of your application | Yes |
| `NODE_ENV` | Environment (development/production) | Yes |
| `ALLOWED_DOMAIN` | Email domain allowed (default: cloudextel.com) | No |
| `ALLOWED_EMAILS` | Comma-separated list of allowed emails | No |

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run process-doa` - Process Excel file into chunks
- `npm run build-index` - Build vector index from processed chunks

## Troubleshooting

### "Vector store not initialized" error

Make sure you've run:
```bash
npm run process-doa
npm run build-index
```

### "GOOGLE_API_KEY not set" error

Check that your `.env` file exists and contains `GOOGLE_API_KEY`

### Authentication not working

- Verify Azure AD credentials are correct in `.env`
- Check redirect URI matches: `http://localhost:3000/api/auth/callback/azure-ad` (dev) or `https://doa.cloud/api/auth/callback/azure-ad` (prod)
- Ensure you're using an authorized @cloudextel.com Microsoft account
- Verify your email is in the `ALLOWED_EMAILS` list

### Domain restriction not working

- Check `ALLOWED_DOMAIN` in `.env` is set to `cloudextel.com`
- Verify email whitelist in `lib/auth.ts` or `ALLOWED_EMAILS` env var

## Notes

- The vector store is rebuilt on each server restart from processed chunks
- For production, consider using a persistent vector store like Pinecone or Weaviate
- MemoryVectorStore is used for simplicity but doesn't persist between restarts
- Excel file should be placed in root directory before running `process-doa`

## Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment guide for production
- **[CODE_REVIEW.md](./CODE_REVIEW.md)** - Code review and defect analysis