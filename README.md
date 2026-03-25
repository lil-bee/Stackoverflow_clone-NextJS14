# DevFlow

A full-stack developer Q&A platform inspired by Stack Overflow — built to explore modern Next.js architecture patterns including Server Actions, SSR/CSR hybrid rendering, and AI-powered features.

🔗 **[Live Demo](https://devflow-lilbee.vercel.app)**

---

## Features

- **Q&A System** — Ask questions, post answers, and engage with the community through upvoting and downvoting
- **AI-Powered Answers** — Generate instant answers using Google Gemini API
- **Gamification** — Reputation system and badges that reward meaningful contributions
- **Advanced Filtering** — Filter questions by tags, recency, frequency, and more
- **Global Search** — Search across questions, answers, users, and tags simultaneously
- **Authentication** — Secure sign-in with Clerk (GitHub, Google, email)
- **Dark / Light Mode** — Persistent theme switching
- **Responsive UI** — Fully responsive across all screen sizes

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | MongoDB + Mongoose |
| Auth | Clerk |
| AI | Google Gemini API |
| UI | Shadcn UI + TailwindCSS |
| Deployment | Vercel |

---

## Architecture Decisions

**Why Server Actions over API Routes?**
Server Actions allow direct database mutations from the client without needing to set up separate API endpoints — reducing boilerplate and keeping data flow colocated with the components that need it. This works well for a CRUD-heavy app like a Q&A platform.

**Why MongoDB?**
The data model for a Q&A platform is document-oriented by nature — questions embed tags, answers, and vote counts. MongoDB's flexible schema made iteration faster during development without the overhead of migrations.

**Why Clerk?**
Handling auth from scratch with NextAuth adds complexity around session management and OAuth providers. Clerk handles this with minimal setup, letting me focus on core product features instead.

**SSR vs CSR tradeoffs**
Pages that benefit from SEO (question listings, individual question pages) use SSR. Interactive components like the vote buttons and comment inputs are client components to maintain responsiveness.

---

## Project Structure

```
├── app/                  # Next.js App Router pages and layouts
├── components/
│   ├── shared/           # Reusable layout components (Navbar, Sidebar)
│   └── ui/               # Shadcn UI primitives
├── lib/
│   └── actions/          # Server Actions for all data mutations
├── database/
│   └── models/           # Mongoose schemas (Question, User, Answer, Tag)
├── types/                # Global TypeScript types
└── constants/            # App-wide constants and config
```

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/lil-bee/Stackoverflow_Clone-NextJS14.git
cd Stackoverflow_Clone-NextJS14

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in: MONGODB_URI, CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, GEMINI_API_KEY

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## What I Learned

- Structuring Server Actions for a complex, multi-model application
- Managing SSR/CSR boundaries in Next.js App Router without over-fetching
- Integrating third-party auth (Clerk) with custom user data in MongoDB
- Building a global search that queries across multiple collections efficiently
