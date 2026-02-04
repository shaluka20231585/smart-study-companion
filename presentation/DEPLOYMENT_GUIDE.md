# Smart Study Companion - Deployment & Access Guide

## Project Information
**Project Name:** Smart Study Companion  
**Student Name:** [Your Name]  
**Student ID:** [Your ID]  
**Supervisor:** [Supervisor Name]  
**Deployment Date:** February 2026  

---

## Live Prototype Access

### Production URL
**🌐 Hosted Application:** `https://[your-app-name].vercel.app`

### Supervisor Access Credentials
For testing and evaluation purposes, please use the following credentials:

**Test Account (Supervisor Access):**
- **Email:** `supervisor@test.com` (or create your own account)
- **Password:** `TestPassword123!` (if pre-created)

**Note:** You can also create your own account by clicking "Sign Up" on the login page.

---

## What's Accessible

### ✅ Fully Functional Features
1. **User Authentication** - Sign up, login, logout
2. **Document Upload** - Upload PDF files (max 10MB)
3. **AI Flashcard Generation** - Automatically generate flashcards from PDFs
4. **AI Quiz Generation** - Create multiple-choice quizzes
5. **AI Chat Tutor** - Ask questions about uploaded documents
6. **Document Summarization** - Get AI-generated summaries
7. **Progress Tracking** - View quiz attempt history and scores
8. **Flashcard Study Mode** - Interactive flip cards

### ⏳ In Development (Not Yet Available)
- Spaced repetition algorithm
- Export flashcards to Anki format
- OCR for scanned PDFs

---

## Testing Instructions

### Getting Started
1. Visit the production URL above
2. Click "Sign Up" to create a new account, or use the test credentials provided
3. After logging in, you'll be redirected to the dashboard

### Recommended Testing Flow

#### Step 1: Upload a Document
1. Navigate to **"Documents"** page
2. Click **"Upload PDF"** button
3. Select a PDF file (sample PDFs available in `/test-data/` folder if needed)
4. Wait for processing (usually 10-30 seconds)
5. Document will appear in your documents list

#### Step 2: Generate Flashcards
1. Click on the uploaded document
2. Click **"Generate Flashcards"** button
3. Wait for AI generation (10-15 seconds)
4. Review generated flashcards
5. Click **"Study"** to enter study mode
6. Click cards to flip front/back

#### Step 3: Generate & Take a Quiz
1. From document detail page, click **"Generate Quiz"**
2. Wait for AI generation (10-15 seconds)
3. Click **"Take Quiz"** to start
4. Answer multiple-choice questions
5. Submit quiz to see results with explanations

#### Step 4: Use AI Chat Tutor
1. Navigate to **"Chat"** page
2. Select a document from the dropdown
3. Ask questions about the document content
4. AI will respond with context from your uploaded PDF

#### Step 5: View Progress
1. Navigate to **"Progress"** page
2. View quiz attempt history
3. See scores, completion dates, and performance trends

---

## Technical Stack (for Assessor Reference)

| Component | Technology |
|-----------|------------|
| **Frontend** | Next.js 16, React, TypeScript, Tailwind CSS |
| **Backend** | Next.js API Routes (serverless) |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth (JWT + Row Level Security) |
| **File Storage** | Supabase Storage (cloud) |
| **AI Service** | OpenAI GPT-4o-mini via Vercel AI SDK |
| **PDF Extraction** | unpdf library |
| **Hosting** | Vercel (production deployment) |

---

## Source Code Access

### GitHub Repository
**Repository URL:** `https://github.com/[your-username]/smart-study-companion`

**Branch:** `main` (production branch)

**Accessing the Code:**
1. Visit the GitHub repository URL above
2. All source code is publicly accessible
3. See `README.md` for project structure and setup instructions

**Key Directories:**
- `/app/` - Next.js pages and API routes
- `/components/` - Reusable React components
- `/lib/` - Core utilities (database, AI, PDF extraction)
- `/contexts/` - React context providers (auth)

---

## Database Access (for Assessment)

### Supabase Project Access
To grant supervisor access to the database and backend infrastructure:

**Option 1: Read-Only Database Access (Recommended)**
1. Supervisor will receive an email invitation to the Supabase project
2. Role: **Read-only** (can view tables, schema, RLS policies)
3. Cannot modify or delete production data

**Option 2: Database Credentials (if needed)**
- **Supabase Project URL:** `https://[project-id].supabase.co`
- **Anon Key:** `[provided separately via secure channel]`
- Access to table viewer and API documentation

### Database Schema Overview
- **users** - User accounts
- **documents** - Uploaded PDF metadata
- **document_content** - Extracted text from PDFs
- **document_chunks** - Text chunks for RAG
- **flashcard_decks** - Flashcard collections
- **flashcards** - Individual flashcards
- **quizzes** - Generated quizzes
- **quiz_questions** - Quiz questions and answers
- **quiz_attempts** - User quiz submissions

**Security:** All tables have Row Level Security (RLS) enabled. Users can only access their own data.

---

## Environment Variables (Deployed on Vercel)

The following environment variables are configured in Vercel's production environment:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=[redacted for security]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[redacted for security]
SUPABASE_SERVICE_KEY=[redacted for security]

# OpenAI Configuration
OPENAI_API_KEY=[redacted for security]
```

**Note:** API keys are not exposed in the repository. They are securely stored in Vercel's environment variables.

---

## Availability Commitment

✅ **Prototype will remain accessible until September 2026** (for external scrutiny)

- **Hosting:** Vercel's free tier or paid plan (ensuring uptime)
- **Database:** Supabase project remains active
- **Monitoring:** Vercel Analytics enabled to track uptime
- **Support:** Available for troubleshooting if issues arise

---

## Known Limitations & Workarounds

### 1. PDF Upload Size Limit
- **Limit:** 10MB per file
- **Reason:** Supabase storage tier and processing efficiency
- **Workaround:** Compress large PDFs before uploading

### 2. AI Generation Time
- **Duration:** 10-30 seconds for flashcards/quizzes
- **Reason:** OpenAI API processing time
- **Note:** Loading indicators show progress

### 3. Scanned PDFs (OCR)
- **Status:** Not yet implemented
- **Current Behavior:** Text extraction will fail on image-based PDFs
- **Workaround:** Use PDFs with selectable text

---

## Troubleshooting

### If the Application Doesn't Load
1. Check your internet connection
2. Clear browser cache and cookies
3. Try a different browser (Chrome, Firefox, Safari, Edge supported)
4. Ensure JavaScript is enabled

### If PDF Upload Fails
1. Check file size is under 10MB
2. Ensure file is a valid PDF (not corrupted)
3. Try a different PDF file
4. Check browser console for error messages

### If AI Generation Hangs
1. Wait up to 30 seconds (large documents take longer)
2. Refresh the page if loading exceeds 1 minute
3. Try with a smaller document first

### If You Can't Login
1. Ensure email and password are correct
2. Check if account was created successfully (check email for verification)
3. Try "Forgot Password" if needed

---

## Contact Information

**For Technical Issues or Questions:**
- **Student Email:** [your-email@university.ac.uk]
- **Response Time:** Within 24 hours (weekdays)

**For Urgent Access Issues:**
- Please email immediately if you cannot access the prototype
- I will prioritize resolving any deployment/access issues

---

## Submission Checklist

- [x] Prototype hosted on Vercel (external platform)
- [x] Production URL provided to supervisor
- [x] Test account credentials provided
- [x] GitHub repository link shared
- [x] Access instructions documented
- [x] Database access granted (read-only)
- [x] Availability commitment made (until September 2026)
- [x] All aspects of product accessible (frontend, backend, database)
- [x] Supervisor can freely access and test the project

---

## IPD Submission Components

### 1. Prototype Link
**Submit:** `https://[your-app-name].vercel.app`

### 2. GitHub Repository
**Submit:** `https://github.com/[your-username]/smart-study-companion`

### 3. Access Document (this file)
**Submit:** `DEPLOYMENT_GUIDE.md` (PDF or Word format)

### 4. Presentation Materials
- IPD Presentation Outline (15 slides)
- Video Demo Script (5-10 minutes)
- Speaker Notes for presentation

---

**End of Deployment Guide**

---

## Quick Start for Supervisor (TL;DR)

1. **Visit:** `https://[your-app-name].vercel.app`
2. **Sign Up:** Create a new account or use provided test credentials
3. **Upload PDF:** Go to Documents → Upload PDF → Select file
4. **Generate Study Materials:** Click document → Generate Flashcards/Quiz
5. **Test Features:** Study flashcards, take quiz, use AI chat
6. **View Code:** Visit GitHub repository (link above)

**Expected Testing Time:** 15-20 minutes to test all major features

---

**Last Updated:** February 2026  
**Document Version:** 1.0
