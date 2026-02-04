# Smart Study Companion

An AI-powered study tool that helps you learn from your PDF documents by generating flashcards, quizzes, and summaries.

## Features

- 📄 **PDF Upload & Processing** - Upload PDFs and automatically extract text
- 🃏 **AI Flashcards** - Generate study flashcards from your documents
- ❓ **AI Quizzes** - Test your knowledge with auto-generated questions
- 💬 **Chat Tutor** - Ask questions about your documents
- 📊 **Progress Tracking** - Track your quiz performance

## Tech Stack

- **Frontend**: Next.js 16, React, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4o-mini via Vercel AI SDK
- **PDF Processing**: unpdf library

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Supabase account
- OpenAI API key

### Environment Variables

Create `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
OPENAI_API_KEY=your_openai_key
```

### Installation

```bash
pnpm install
pnpm dev
```

## Project Structure

```
app/
├── (auth)/           # Login & signup pages
├── (dashboard)/      # Main app pages
│   ├── dashboard/    # Home dashboard
│   ├── documents/    # Document management
│   ├── flashcards/   # Flashcard decks
│   ├── quizzes/      # Quiz list
│   ├── chat/         # AI chat
│   ├── progress/     # Study progress
│   └── settings/     # User settings
├── api/              # API routes
│   ├── documents/    # PDF processing
│   ├── flashcards/   # Flashcard generation
│   ├── quiz/         # Quiz generation
│   └── chat/         # Chat API

lib/
├── ai.ts             # AI generation functions
├── queries.ts        # Database queries
├── supabase.ts       # Supabase client
├── types.ts          # TypeScript types
└── utils.ts          # Utility functions

components/
├── ui/               # shadcn/ui components
└── dashboard/        # Dashboard components
```

## Usage

1. **Upload a PDF** - Go to Documents → Upload
2. **Wait for processing** - Text extraction takes a few seconds
3. **Generate study materials**:
   - Click "Generate Flashcards" for flashcards
   - Click "Generate Quiz" for quiz questions
   - Click "Chat with AI Tutor" to ask questions
4. **Study & Track Progress** - View your performance over time
