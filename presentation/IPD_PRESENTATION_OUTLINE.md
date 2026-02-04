# Smart Study Companion - IPD Presentation Outline
## 20-Minute Presentation (15 slides)

---

## Slide 1: Title Slide (30 seconds)
**Title:** Smart Study Companion
**Subtitle:** AI-Powered Learning Platform for Students
**Your Name:** [Your Name]
**Student ID:** [Your ID]
**Supervisor:** [Supervisor Name]
**Date:** February 2026

---

## Slide 2: Project Overview & Aims (1 minute)
### What is Smart Study Companion?

**Project Vision:**
An AI-powered web application that transforms study materials into interactive learning tools

**Aims & Objectives:**
1. Automate the creation of study materials from PDF documents
2. Implement AI-generated flashcards, quizzes, and summaries
3. Provide an intelligent tutoring system for document-based Q&A
4. Track and visualize learning progress over time
5. Reduce manual study preparation time by 80%

**Problem Statement:**
- Students spend 3-5 hours creating flashcards from a single textbook chapter
- Manual quiz creation is tedious and inconsistent
- No personalized feedback on learning progress

---

## Slide 3: Project Stakeholders - Onion Model (1.5 minutes)
### Stakeholder Analysis

```
┌─────────────────────────────────────────────────────────────┐
│                    EXTERNAL ENVIRONMENT                      │
│  • Educational Institutions  • AI/EdTech Industry           │
│  • Data Protection Regulators (GDPR)                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              WIDER ENVIRONMENT                       │    │
│  │  • University IT Services  • OpenAI (API Provider)  │    │
│  │  • Supabase (Infrastructure)                        │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │           OPERATIONAL AREA                   │    │    │
│  │  │  • Project Supervisor  • Course Coordinator │    │    │
│  │  │  • Beta Testers (Fellow Students)           │    │    │
│  │  │  ┌─────────────────────────────────────┐    │    │    │
│  │  │  │         THE SYSTEM                  │    │    │    │
│  │  │  │  • Primary Users: Students          │    │    │    │
│  │  │  │  • Developer: [Your Name]           │    │    │    │
│  │  │  └─────────────────────────────────────┘    │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**Key Stakeholder Roles & Influence:**

| Stakeholder | Role | Interest | Influence on Project |
|-------------|------|----------|---------------------|
| **Students** (Primary) | End Users | Easy study tools, time saving | Drove feature prioritization (flashcards, quizzes) |
| **Project Supervisor** | Advisor | Academic quality, feasibility | Guided technical decisions, scope management |
| **Beta Testers** | Quality Assurance | Usability, bug detection | UI/UX improvements based on feedback |
| **OpenAI** | Service Provider | API usage compliance | Influenced AI prompt design, cost optimization |
| **University** | Institution | Data protection, ethics | Required GDPR compliance, ethical AI use |

---

## Slide 4: Functional Requirements (1.5 minutes)
### What the System Must Do

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| **FR1** | User shall be able to register and login securely | Must Have | ✅ Implemented |
| **FR2** | User shall be able to upload PDF documents (max 10MB) | Must Have | ✅ Implemented |
| **FR3** | System shall extract text from uploaded PDFs | Must Have | ✅ Implemented |
| **FR4** | System shall generate AI flashcards from document content | Must Have | ✅ Implemented |
| **FR5** | System shall generate AI quizzes with multiple choice questions | Must Have | ✅ Implemented |
| **FR6** | User shall be able to take quizzes and receive immediate feedback | Must Have | ✅ Implemented |
| **FR7** | System shall provide AI-powered chat for document Q&A | Should Have | ✅ Implemented |
| **FR8** | System shall generate document summaries | Should Have | ✅ Implemented |
| **FR9** | User shall be able to view quiz attempt history and scores | Should Have | ✅ Implemented |
| **FR10** | User shall be able to study flashcards with flip interaction | Must Have | ✅ Implemented |
| **FR11** | System shall support spaced repetition scheduling | Could Have | ⏳ Pending |
| **FR12** | User shall be able to export flashcards to external formats | Could Have | ⏳ Pending |
| **FR13** | System shall support OCR for scanned PDFs | Won't Have (this phase) | ❌ Not Started |

**Implementation Rate: 10/13 (77%) functional requirements complete**

---

## Slide 5: Non-Functional Requirements (1 minute)
### Quality Attributes & Constraints

| ID | Category | Requirement | Status |
|----|----------|-------------|--------|
| **NFR1** | Performance | PDF processing shall complete within 30 seconds | ✅ Met |
| **NFR2** | Performance | AI generation shall respond within 15 seconds | ✅ Met |
| **NFR3** | Scalability | System shall handle 100 concurrent users | ✅ Architecture supports |
| **NFR4** | Security | All user data shall be encrypted at rest and in transit | ✅ Met (Supabase) |
| **NFR5** | Security | Users shall only access their own documents | ✅ Met (RLS policies) |
| **NFR6** | Usability | Interface shall be intuitive with < 5 min learning curve | ✅ Met |
| **NFR7** | Availability | System shall have 99% uptime | ✅ Met (Vercel/Supabase) |
| **NFR8** | Compatibility | System shall work on Chrome, Firefox, Safari, Edge | ✅ Met |
| **NFR9** | Maintainability | Code shall follow TypeScript best practices | ✅ Met |
| **NFR10** | Compliance | System shall comply with GDPR for data handling | ✅ Met |

---

## Slide 6: Use Case Diagram (1.5 minutes)
### System Interactions

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        SMART STUDY COMPANION                              │
│                                                                          │
│    ┌─────────────┐                                                       │
│    │   Sign Up   │◄────────────┐                                         │
│    └─────────────┘             │                                         │
│           │                    │                                         │
│    ┌─────────────┐             │                                         │
│    │   Log In    │◄────────────┤                                         │
│    └─────────────┘             │                                         │
│           │                    │                                         │
│    ┌─────────────┐             │         ┌─────────────┐                 │
│    │Upload PDF   │◄────────────┤         │   OpenAI    │                 │
│    └─────────────┘             │         │    API      │                 │
│           │                    │         └──────┬──────┘                 │
│           ▼                    │                │                        │
│    ┌─────────────┐             │                │                        │
│    │Extract Text │─────────────┼────────────────┘                        │
│    └─────────────┘             │                                         │
│           │                    │                                         │
│    ┌──────┴──────┐      ┌──────┴──────┐                                  │
│    ▼             ▼      │             │                                  │
│ ┌────────┐ ┌────────┐   │   STUDENT   │                                  │
│ │Generate│ │Generate│   │   (Actor)   │                                  │
│ │Flash-  │ │ Quiz   │◄──┤             │                                  │
│ │cards   │ │        │   │             │                                  │
│ └────────┘ └────────┘   └──────┬──────┘                                  │
│     │           │              │                                         │
│     ▼           ▼              │                                         │
│ ┌────────┐ ┌────────┐          │                                         │
│ │ Study  │ │  Take  │◄─────────┤                                         │
│ │ Cards  │ │  Quiz  │          │                                         │
│ └────────┘ └────────┘          │                                         │
│                │               │                                         │
│                ▼               │                                         │
│         ┌────────────┐         │                                         │
│         │View Results│◄────────┤                                         │
│         └────────────┘         │                                         │
│                                │                                         │
│    ┌─────────────┐             │                                         │
│    │Chat with AI │◄────────────┤                                         │
│    │   Tutor     │             │                                         │
│    └─────────────┘             │                                         │
│                                │                                         │
│    ┌─────────────┐             │                                         │
│    │View Progress│◄────────────┘                                         │
│    └─────────────┘                                                       │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Primary Use Cases:**
1. **Upload & Process Document** - User uploads PDF, system extracts and stores text
2. **Generate Study Materials** - System creates flashcards/quizzes from content
3. **Study & Practice** - User studies flashcards, takes quizzes
4. **Get AI Assistance** - User asks questions, AI responds with context
5. **Track Progress** - User views performance history and statistics

---

## Slide 7: System Architecture (2 minutes)
### Overall Design & Technology Choices

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    Next.js 16 (React Framework)                      │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │    │
│  │  │Dashboard │ │Documents │ │Flashcards│ │  Quiz    │ │   Chat   │   │    │
│  │  │  Page    │ │  Page    │ │   Page   │ │  Page    │ │   Page   │   │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │    │
│  │                     Tailwind CSS + shadcn/ui                         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER (Next.js API Routes)                  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│  │ /api/      │ │ /api/      │ │ /api/      │ │ /api/      │               │
│  │ documents/ │ │ flashcards/│ │ quiz/      │ │ chat       │               │
│  │ extract    │ │ generate   │ │ generate   │ │            │               │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘               │
└────────┼──────────────┼──────────────┼──────────────┼───────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SERVICE LAYER                                      │
│  ┌─────────────────┐    ┌─────────────────────────────────────────────┐     │
│  │   unpdf         │    │              OpenAI GPT-4o-mini             │     │
│  │ (PDF Extraction)│    │  • Flashcard Generation                     │     │
│  └────────┬────────┘    │  • Quiz Generation                          │     │
│           │             │  • Summarization                            │     │
│           ▼             │  • Chat/RAG                                 │     │
│  ┌─────────────────┐    └─────────────────────────────────────────────┘     │
│  │ Text Processing │                        │                               │
│  │ • Cleaning      │                        │                               │
│  │ • Chunking      │                        ▼                               │
│  │ • Validation    │    ┌─────────────────────────────────────────────┐     │
│  └────────┬────────┘    │           Vercel AI SDK (Streaming)         │     │
│           │             └─────────────────────────────────────────────┘     │
└───────────┼─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER (Supabase)                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │  PostgreSQL     │  │   Auth          │  │   Storage       │             │
│  │  Database       │  │   (JWT + RLS)   │  │   (PDF Files)   │             │
│  │                 │  │                 │  │                 │             │
│  │  • documents    │  │  • User signup  │  │  • File upload  │             │
│  │  • flashcards   │  │  • User login   │  │  • File download│             │
│  │  • quizzes      │  │  • Sessions     │  │  • Access control│            │
│  │  • attempts     │  │                 │  │                 │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Technology Justification:**
| Technology | Reason for Choice |
|------------|-------------------|
| Next.js 16 | Full-stack React, server components, API routes |
| TypeScript | Type safety, better IDE support, fewer runtime errors |
| Supabase | Open-source Firebase alternative, PostgreSQL, built-in auth |
| OpenAI GPT-4o-mini | Cost-effective, high quality output, structured responses |
| Tailwind CSS | Rapid UI development, consistent styling |
| unpdf | Native Node.js PDF parsing (no browser dependencies) |

---

## Slide 8: Component Structure & Data Flow (1.5 minutes)
### Application Component Hierarchy

```
App
├── (auth)/                          # Authentication Pages
│   ├── layout.tsx                   # Auth layout wrapper
│   ├── login/page.tsx               # Login form
│   └── signup/page.tsx              # Registration form
│
├── (dashboard)/                     # Protected Dashboard Area
│   ├── layout.tsx                   # Dashboard layout (sidebar, header)
│   ├── dashboard/page.tsx           # Main dashboard with stats
│   ├── documents/
│   │   ├── page.tsx                 # Document list
│   │   └── [id]/
│   │       ├── page.tsx             # Document detail
│   │       ├── flashcards/page.tsx  # Generate flashcards
│   │       └── quiz/page.tsx        # Generate quiz
│   ├── flashcards/
│   │   ├── page.tsx                 # All flashcard decks
│   │   └── [id]/page.tsx            # Study flashcards
│   ├── quizzes/
│   │   ├── page.tsx                 # All quizzes
│   │   └── [id]/page.tsx            # Take quiz
│   ├── chat/page.tsx                # AI Chat interface
│   ├── progress/page.tsx            # Progress tracking
│   └── settings/page.tsx            # User settings
│
├── api/                             # API Routes (Server-side)
│   ├── documents/extract/route.ts   # PDF extraction endpoint
│   ├── flashcards/generate/route.ts # Flashcard generation
│   ├── quiz/generate/route.ts       # Quiz generation
│   └── chat/route.ts                # AI chat streaming
│
├── components/                      # Reusable UI Components
│   ├── ui/                          # shadcn/ui primitives
│   └── dashboard/                   # Dashboard-specific components
│
├── lib/                             # Core Utilities
│   ├── supabase.ts                  # Database client
│   ├── ai.ts                        # AI generation functions
│   ├── queries.ts                   # Database queries
│   └── pdf-extraction-utils.ts      # Text processing
│
└── contexts/
    └── auth-context.tsx             # Authentication state
```

---

## Slide 9: Class Diagram (1.5 minutes)
### Object-Oriented System Design

```
┌───────────────────────────────────────────────────────────────────────────┐
│                            CLASS DIAGRAM (UML)                            │
└───────────────────────────────────────────────────────────────────────────┘

┌────────────────────────┐
│       User             │
├────────────────────────┤
│ - id: string           │
│ - email: string        │
│ - createdAt: Date      │
├────────────────────────┤
│ + signup(): void       │
│ + login(): void        │
│ + logout(): void       │
└───────────┬────────────┘
            │ 1
            │ owns
            │ *
┌───────────▼────────────┐          ┌─────────────────────┐
│      Document          │          │   PDFExtractor      │
├────────────────────────┤          ├─────────────────────┤
│ - id: string           │          │ - library: unpdf    │
│ - userId: string       │          ├─────────────────────┤
│ - name: string         │◄─────────│ + extractText():    │
│ - fileUrl: string      │ uses     │   Promise<string>   │
│ - fileSize: number     │          │ + validateText():   │
│ - status: string       │          │   boolean           │
│ - pageCount: number    │          └─────────────────────┘
│ - content: string      │
├────────────────────────┤
│ + upload(): void       │
│ + process(): void      │          ┌─────────────────────┐
│ + delete(): void       │          │   TextProcessor     │
└───────────┬────────────┘          ├─────────────────────┤
            │ 1                     │ - targetTokens: int │
            │                       ├─────────────────────┤
            │                       │ + cleanText(): str  │
            │ generates             │ + chunkText(): str[]│
            │                       │ + estimateTokens(): │
            │ *                     │   int               │
┌───────────▼────────────┐          └─────────────────────┘
│   DocumentChunk        │                    ▲
├────────────────────────┤                    │
│ - id: string           │                    │ uses
│ - documentId: string   │                    │
│ - chunkIndex: number   │          ┌─────────┴───────────┐
│ - content: string      │          │    AIService        │
│ - tokenCount: number   │          ├─────────────────────┤
└────────────────────────┘          │ - model: GPT-4o-mini│
            │                       │ - apiKey: string    │
            │ 1                     ├─────────────────────┤
            │                       │ + generateFlashcards│
            │ feeds to              │   (): Flashcard[]   │
            │                       │ + generateQuiz():   │
            │ *                     │   Quiz              │
            └───────────────────────│ + chat(): string    │
                                    │ + summarize(): str  │
                                    └──────────┬──────────┘
                                               │ creates
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    │ *                        │ *                        │ *
        ┌───────────▼────────────┐ ┌──────────▼──────────┐  ┌───────────▼────────────┐
        │   FlashcardDeck        │ │       Quiz          │  │      ChatMessage       │
        ├────────────────────────┤ ├─────────────────────┤  ├────────────────────────┤
        │ - id: string           │ │ - id: string        │  │ - id: string           │
        │ - userId: string       │ │ - userId: string    │  │ - userId: string       │
        │ - documentId: string   │ │ - documentId: string│  │ - documentId: string   │
        │ - name: string         │ │ - name: string      │  │ - role: string         │
        │ - createdAt: Date      │ │ - createdAt: Date   │  │ - content: string      │
        ├────────────────────────┤ ├─────────────────────┤  │ - timestamp: Date      │
        │ + create(): void       │ │ + create(): void    │  └────────────────────────┘
        │ + delete(): void       │ │ + delete(): void    │
        └───────────┬────────────┘ └──────────┬──────────┘
                    │ 1                       │ 1
                    │ contains                │ contains
                    │ *                       │ *
        ┌───────────▼────────────┐ ┌──────────▼──────────┐
        │      Flashcard         │ │   QuizQuestion      │
        ├────────────────────────┤ ├─────────────────────┤
        │ - id: string           │ │ - id: string        │
        │ - deckId: string       │ │ - quizId: string    │
        │ - front: string        │ │ - question: string  │
        │ - back: string         │ │ - options: string[] │
        │ - difficulty: number   │ │ - correctAnswer: int│
        │ - reviewCount: number  │ │ - explanation: str  │
        │ - correctCount: number │ ├─────────────────────┤
        │ - lastReviewed: Date   │ │ + validate(): bool  │
        ├────────────────────────┤ └─────────────────────┘
        │ + flip(): void         │
        │ + markCorrect(): void  │            │ 1
        │ + markWrong(): void    │            │ answered in
        └────────────────────────┘            │ *
                                   ┌──────────▼──────────┐
                                   │   QuizAttempt       │
                                   ├─────────────────────┤
                                   │ - id: string        │
                                   │ - quizId: string    │
                                   │ - userId: string    │
                                   │ - score: number     │
                                   │ - totalQuestions: n │
                                   │ - timeTaken: number │
                                   │ - completedAt: Date │
                                   ├─────────────────────┤
                                   │ + submit(): void    │
                                   │ + calculateScore(): │
                                   │   number            │
                                   └─────────────────────┘

                    ┌─────────────────────────────────────────┐
                    │      SupabaseClient (Database)          │
                    ├─────────────────────────────────────────┤
                    │ + from(table: string): QueryBuilder     │
                    │ + auth: AuthService                     │
                    │ + storage: StorageService               │
                    └─────────────────────────────────────────┘
```

**Design Patterns Used:**
- **Repository Pattern**: Supabase client abstracts data access
- **Service Layer**: AIService, PDFExtractor, TextProcessor encapsulate logic
- **Composition**: Document → DocumentChunk → AI-generated content
- **Aggregation**: User owns multiple Documents, FlashcardDecks, Quizzes

**Key Relationships:**
- User **1 : *** Document (one user has many documents)
- Document **1 : *** DocumentChunk (one document has many chunks)
- Document **1 : *** FlashcardDeck (one document generates many decks)
- FlashcardDeck **1 : *** Flashcard (one deck contains many cards)
- Document **1 : *** Quiz (one document generates many quizzes)
- Quiz **1 : *** QuizQuestion (one quiz has many questions)
- Quiz **1 : *** QuizAttempt (one quiz has many attempts by users)

---

## Slide 10: Database Schema - Entity Relationship Diagram (1.5 minutes)
### Data Persistence Layer

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ENTITY RELATIONSHIP DIAGRAM                          │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────┐         ┌─────────────────┐         ┌─────────────────┐
  │    users    │         │    documents    │         │ document_chunks │
  ├─────────────┤         ├─────────────────┤         ├─────────────────┤
  │ PK: id      │◄───┐    │ PK: id          │◄───┐    │ PK: id          │
  │ email       │    │    │ FK: user_id     │────┘    │ FK: document_id │
  │ created_at  │    │    │ name            │◄────────│ chunk_index     │
  └─────────────┘    │    │ file_url        │         │ content         │
                     │    │ file_size       │         │ token_count     │
                     │    │ status          │         └─────────────────┘
                     │    │ page_count      │
                     │    │ created_at      │         ┌─────────────────┐
                     │    └─────────────────┘         │document_content │
                     │              │                 ├─────────────────┤
                     │              │                 │ PK: id          │
                     │              ▼                 │ FK: document_id │
                     │    ┌─────────────────┐         │ text            │
                     │    │ flashcard_decks │         │ extracted_at    │
                     │    ├─────────────────┤         └─────────────────┘
                     │    │ PK: id          │
                     ├────│ FK: user_id     │
                     │    │ FK: document_id │────────────────┐
                     │    │ name            │                │
                     │    │ created_at      │                │
                     │    └────────┬────────┘                │
                     │             │                         │
                     │             ▼                         │
                     │    ┌─────────────────┐                │
                     │    │   flashcards    │                │
                     │    ├─────────────────┤                │
                     │    │ PK: id          │                │
                     │    │ FK: deck_id     │                │
                     │    │ front           │                │
                     │    │ back            │                │
                     │    │ difficulty      │                │
                     │    │ review_count    │                │
                     │    │ correct_count   │                │
                     │    └─────────────────┘                │
                     │                                       │
                     │    ┌─────────────────┐                │
                     │    │     quizzes     │                │
                     │    ├─────────────────┤                │
                     ├────│ FK: user_id     │                │
                     │    │ PK: id          │◄───────────────┘
                     │    │ FK: document_id │
                     │    │ name            │
                     │    │ created_at      │
                     │    └────────┬────────┘
                     │             │
                     │             ▼
                     │    ┌─────────────────┐    ┌─────────────────┐
                     │    │ quiz_questions  │    │  quiz_attempts  │
                     │    ├─────────────────┤    ├─────────────────┤
                     │    │ PK: id          │    │ PK: id          │
                     │    │ FK: quiz_id     │    │ FK: quiz_id     │
                     │    │ question        │    │ FK: user_id     │────┘
                     │    │ options[]       │    │ score           │
                     │    │ correct_answer  │    │ total_questions │
                     │    │ explanation     │    │ time_taken      │
                     │    └─────────────────┘    │ completed_at    │
                     │                           └─────────────────┘
                     │
                     └────────────────────────────────────────────────────
```

**Row Level Security (RLS) Policies:**
- All tables have RLS enabled
- Users can only SELECT, INSERT, UPDATE, DELETE their own records
- Foreign key relationships ensure data integrity
- Service key used for server-side operations

---

## Slide 10: AI/ML Pipeline - Sequence Diagram (2 minutes)
### AI Generation Workflow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │     │  Next.js │     │  unpdf   │     │ Supabase │     │  OpenAI  │
│ Browser  │     │  Server  │     │ Library  │     │ Database │     │   API    │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │                │
     │  1. Upload PDF │                │                │                │
     │───────────────>│                │                │                │
     │                │                │                │                │
     │                │  2. Store File │                │                │
     │                │────────────────────────────────>│                │
     │                │                │                │                │
     │                │  3. Extract Text                │                │
     │                │───────────────>│                │                │
     │                │                │                │                │
     │                │  4. Return Text│                │                │
     │                │<───────────────│                │                │
     │                │                │                │                │
     │                │  5. Clean & Validate Text       │                │
     │                │─────────────────────────────────────────────────>│
     │                │                │                │                │
     │                │  6. Chunk Text │                │                │
     │                │────────────────────────────────>│                │
     │                │                │   Store Chunks │                │
     │                │                │                │                │
     │  7. Request Flashcards          │                │                │
     │───────────────>│                │                │                │
     │                │                │                │                │
     │                │  8. Retrieve Chunks             │                │
     │                │<─────────────────────────────── │                │
     │                │                │                │                │
     │                │  9. Send to AI with Prompt      │                │
     │                │─────────────────────────────────────────────────>│
     │                │                │                │                │
     │                │  10. Stream Response            │                │
     │                │<─────────────────────────────────────────────────│
     │                │                │                │                │
     │  11. Display   │                │                │                │
     │<───────────────│                │                │                │
     │                │                │                │                │
     │  12. Save Flashcards            │                │                │
     │───────────────>│────────────────────────────────>│                │
     │                │                │                │                │
```

**AI Prompt Engineering Strategy:**

```javascript
// Bloom's Taxonomy Distribution for Quiz Questions
{
  "Remember": "25% - Basic recall of facts and definitions",
  "Understand": "35% - Explain concepts, compare ideas", 
  "Apply": "20% - Use knowledge in new situations",
  "Analyze": "20% - Break down information, identify patterns"
}

// Anti-Hallucination Measures
1. ONLY use information explicitly stated in the document
2. If unsure about a fact, DO NOT include it
3. Every answer must be verifiable from the text
4. Use exact terminology from the document
```

---

## Slide 11: Key Algorithm - Text Chunking (1 minute)
### Document Processing Algorithm

```
ALGORITHM: ChunkTextForRAG
INPUT: extractedText (string), targetTokens (800), overlap (100)
OUTPUT: chunks[] (array of text segments)

1. FUNCTION chunkText(text, targetTokens, overlap):
2.     sentences = text.SPLIT_BY_SENTENCES()  // Split on .!?
3.     chunks = []
4.     currentChunk = ""
5.     currentTokens = 0
6.     
7.     FOR EACH sentence IN sentences:
8.         sentenceTokens = ESTIMATE_TOKENS(sentence)  // ~4 chars/token
9.         
10.        IF currentTokens + sentenceTokens > targetTokens AND currentChunk != "":
11.            chunks.APPEND(currentChunk)
12.            
13.            // Create overlap from end of current chunk
14.            overlapText = GET_LAST_N_TOKENS(currentChunk, overlap)
15.            currentChunk = overlapText + " " + sentence
16.            currentTokens = ESTIMATE_TOKENS(currentChunk)
17.        ELSE:
18.            currentChunk = currentChunk + sentence
19.            currentTokens = ESTIMATE_TOKENS(currentChunk)
20.    
21.    IF currentChunk != "":
22.        chunks.APPEND(currentChunk)
23.    
24.    RETURN chunks

COMPLEXITY: O(n) where n = number of sentences
SPACE: O(m) where m = number of chunks
```

**Why Chunking with Overlap?**
- OpenAI has token limits (~4096 for context)
- Overlap preserves context at chunk boundaries
- Enables efficient RAG (Retrieval-Augmented Generation)
- 800 tokens ≈ 3200 characters ≈ 1 page of text

---

## Slide 12: Progress Since PPRS (1.5 minutes)
### Development Journey

**Initial PPRS Scope vs Current Implementation:**

| Feature | PPRS Status | Current Status | Notes |
|---------|-------------|----------------|-------|
| User Authentication | Planned | ✅ Complete | Migrated from Firebase to Supabase |
| Document Upload & Storage | Planned | ✅ Complete | Cloud storage with access control |
| PDF Text Extraction | Planned | ✅ Complete | Tried 4 libraries, settled on unpdf |
| AI Flashcard Generation | Planned | ✅ Complete | Bloom's Taxonomy-based prompts |
| AI Quiz Generation | Planned | ✅ Complete | MCQ with immediate feedback |
| AI Document Summarization | Not Planned | ✅ Added | Structured section summaries |
| AI Chat Tutor | Not Planned | ✅ Added | RAG-based Q&A system |
| Progress Tracking | Planned | ✅ Complete | Quiz history, scores, analytics |
| Spaced Repetition | Planned | ⏳ Partial | Basic tracking, algorithm pending |
| Mobile App | Planned | ❌ Deferred | Focus on web responsiveness |

**Scope Changes Explained:**
- Added AI Chat & Summarization based on beta tester feedback
- Deferred mobile app to prioritize core AI features
- Migrated to Supabase for better developer experience

---

## Slide 13: Updated Time Schedule - Gantt Chart (1.5 minutes)
### Project Timeline

```
2025                                    2026
Oct    Nov    Dec    Jan    Feb    Mar    Apr    May
 |      |      |      |      |      |      |      |
 ├──────┴──────┴──────┴──────┴──────┴──────┴──────┤
 │                                                 │
 │  PHASE 1: PLANNING & SETUP (Oct-Nov 2025)      │
 │  ████████████████                               │
 │  • PPRS Submission ✅                           │
 │  • Tech stack selection ✅                      │
 │  • Database schema design ✅                    │
 │                                                 │
 │  PHASE 2: CORE DEVELOPMENT (Nov 2025-Jan 2026) │
 │           ████████████████████████              │
 │  • Authentication system ✅                     │
 │  • Document upload/storage ✅                   │
 │  • PDF extraction ✅                            │
 │  • AI flashcard generation ✅                   │
 │  • AI quiz generation ✅                        │
 │                                                 │
 │  PHASE 3: ENHANCEMENT (Jan-Feb 2026)           │
 │                     ██████████████              │
 │  • AI chat tutor ✅                             │
 │  • Progress tracking ✅                         │
 │  • UI/UX improvements ✅                        │
 │  ◄─── IPD (Current) ───►                       │
 │                                                 │
 │  PHASE 4: POLISH & TESTING (Feb-Mar 2026)      │
 │                           ██████████            │
 │  • Spaced repetition algorithm                  │
 │  • Beta testing with students                   │
 │  • Bug fixes & optimization                     │
 │                                                 │
 │  PHASE 5: COMPLETION (Mar-Apr 2026)            │
 │                                 ████████        │
 │  • Final testing                                │
 │  • Documentation                                │
 │  • Dissertation writing                         │
 │  • Final submission                             │
 │                                                 │
 └─────────────────────────────────────────────────┘
```

**Timeline Changes from Original PPRS:**
| Change | Original | Revised | Reason |
|--------|----------|---------|--------|
| PDF Extraction | 2 weeks | 4 weeks | Multiple library failures required exploration |
| AI Chat Feature | Not planned | 3 weeks | Added based on user feedback |
| Mobile App | Phase 3 | Deferred | Prioritized web features |
| Supabase Migration | N/A | 1 week | Changed from Firebase for better DX |

---

## Slide 14: Critical Evaluation & Lessons Learned (1.5 minutes)
### Development Challenges & Solutions

**Challenge 1: PDF Text Extraction**
- *Problem:* Multiple libraries failed in Node.js server environment
- *Tried:* pdfjs-dist (worker errors), pdf-parse (browser APIs), pdf2json (encoding), tesseract.js (module errors)
- *Solution:* unpdf library - pure JavaScript, no dependencies
- *Lesson:* Test core dependencies early in real environment

**Challenge 2: AI Output Quality**
- *Problem:* AI generated questions about PDF metadata instead of content
- *Root Cause:* Broken extraction returning binary data
- *Solution:* Added text quality validation pipeline
- *Lesson:* Always validate intermediate outputs

**Challenge 3: Database Schema Mismatches**
- *Problem:* TypeScript types (camelCase) didn't match Supabase columns (snake_case)
- *Solution:* Systematic audit and alignment of naming conventions
- *Lesson:* Define conventions early and enforce consistently

**What Went Well:**
✅ Technology stack choices were appropriate
✅ Incremental development allowed early feedback
✅ TypeScript caught many bugs at compile time
✅ Supabase simplified backend development

---

## Slide 15: Conclusion & Next Steps (1 minute)
### Summary & Demo

**Key Achievements:**
✅ 10/13 functional requirements implemented (77%)
✅ All non-functional requirements met
✅ Full authentication and authorization
✅ Complete document processing pipeline
✅ AI-powered flashcard, quiz, and chat features
✅ Progress tracking and analytics

**Remaining Work (8 weeks):**
1. Implement spaced repetition algorithm
2. Add export functionality (Anki format)
3. Comprehensive beta testing
4. Performance optimization
5. Final documentation

**Project Status:** ✅ On track for completion

---

**"Now let me demonstrate the working prototype..."**

[Transition to video demo]

---

# Diagrams to Create for PowerPoint

1. **Onion Model Diagram** (Slide 3) - Stakeholder layers
2. **Use Case Diagram** (Slide 6) - UML standard notation  
3. **System Architecture Diagram** (Slide 7) - Layered architecture
4. **Entity Relationship Diagram** (Slide 9) - Database schema
5. **Sequence Diagram** (Slide 10) - AI generation flow
6. **Gantt Chart** (Slide 13) - Project timeline

**Recommended Tools:**
- Draw.io (free, exports to PNG/SVG)
- Lucidchart (professional diagrams)
- Mermaid.js (code-based diagrams)
- PlantUML (for sequence diagrams)

---

# Checklist Before Recording

- [ ] All diagrams created and inserted
- [ ] Screenshots of actual application included
- [ ] Test all features work in prototype
- [ ] Prepare sample PDF for demo
- [ ] Practice timing (aim for 18-19 minutes)
- [ ] Check microphone audio quality
- [ ] Ensure prototype is accessible to supervisor

---

# Deployment & Access Information

## Hosting Platform: Vercel

**Production URL:** `https://[your-app-name].vercel.app`

**Why Vercel?**
- Automatic deployment from GitHub
- Built-in CDN and SSL certificates
- Serverless function support (for Next.js API routes)
- Free tier suitable for prototype
- 99.99% uptime guarantee
- Easy environment variable management

## Supervisor Access

### 1. Live Prototype Access
- **URL:** Provided in deployment guide
- **Test Credentials:** Pre-created account or self-registration
- **Features:** Full access to all implemented functionality

### 2. Source Code Access
- **GitHub Repository:** Public repository with full source code
- **Branch:** `main` (production)
- **Documentation:** README.md with setup instructions

### 3. Database Access (Supabase)
- **Access Level:** Read-only invitation sent to supervisor
- **View:** Database schema, tables, RLS policies
- **Cannot:** Modify or delete production data

## Accessibility Commitment

✅ **Prototype will remain available until September 2026** (for external scrutiny)

- Vercel hosting remains active
- Supabase database remains operational
- All backend services (OpenAI API) functional
- Monitoring enabled to ensure uptime

## Documentation Provided

1. **DEPLOYMENT_GUIDE.md** - Comprehensive access instructions
2. **DEPLOYMENT_CHECKLIST.md** - Step-by-step deployment process
3. **IPD_PRESENTATION_OUTLINE.md** - This presentation document
4. **VIDEO_DEMO_SCRIPT.md** - Demo narration script
5. **SPEAKER_NOTES.md** - Presentation speaking notes

---

# Updated Diagrams List

1. **Onion Model Diagram** (Slide 3) - Stakeholder layers
2. **Use Case Diagram** (Slide 6) - UML standard notation  
3. **System Architecture Diagram** (Slide 7) - Layered architecture
4. **Class Diagram** (Slide 9) - Object-oriented design
5. **Entity Relationship Diagram** (Slide 10) - Database schema
6. **Sequence Diagram** (Slide 11) - AI generation flow
7. **Gantt Chart** (Slide 13) - Project timeline

**Recommended Tools:**
- Draw.io (free, exports to PNG/SVG)
- Lucidchart (professional diagrams)
- Mermaid.js (code-based diagrams)
- PlantUML (for sequence diagrams)
