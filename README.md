# InitAI — AI Interview Simulator

A full-stack mock interview platform that simulates a real technical interview end-to-end: behavioral screening with a voice AI interviewer, a live coding challenge, and a personalized debrief report.

## How it works

1. **Intake** — describe your target role and upload your resume (PDF or .txt). Claude generates a personalised interview plan calibrated to your level (Intern / Junior / Mid / Senior).
2. **Behavioral round** — voice-only conversation with "Alex", the AI interviewer. No typing — you speak, Alex listens and responds.
3. **Coding round** — Monaco editor with a problem matched to your level from the Supabase problem bank. You can ask Alex for hints via voice at any time.
4. **Debrief** — structured report with category scores, per-category feedback, and a prioritised improvement plan.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Monaco Editor |
| Backend | Spring Boot 3.5, Java 21, Spring Data JPA, Apache PDFBox |
| AI | Anthropic Claude (`claude-sonnet-4-6`) via REST |
| Database | Supabase (PostgreSQL) |
| Voice | Web Speech API (browser-native, Chrome/Edge) |

## Project structure

```
InitAI/
├── backend/          # Spring Boot API
│   └── src/main/java/com/initai/backend/
│       ├── controller/   # REST endpoints
│       ├── model/        # JPA entities + request/response DTOs
│       ├── repository/   # Spring Data repositories
│       └── service/      # Claude integration, session logic, prompts
├── frontend/         # Next.js app
│   └── app/
│       ├── page.tsx                         # Intake form
│       ├── interview/[sessionId]/           # Behavioral chat
│       ├── interview/[sessionId]/code/      # Coding editor
│       └── interview/[sessionId]/debrief/   # Score report
├── dev.py            # One-command dev launcher
└── .env              # Local secrets (not committed)
```

## API endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/sessions/plan` | Generate interview plan from goal + resume |
| `POST` | `/api/sessions` | Create session from confirmed plan |
| `POST` | `/api/sessions/{id}/behavioral` | Send behavioral message, get Alex's reply |
| `GET` | `/api/sessions/{id}/problem` | Get the assigned coding problem |
| `POST` | `/api/sessions/{id}/hint` | Ask Alex for a hint during coding |
| `POST` | `/api/sessions/{id}/submit` | Submit code, trigger debrief |
| `GET` | `/api/sessions/{id}/debrief` | Retrieve stored debrief report |
| `POST` | `/api/resume/extract` | Extract text from a PDF upload |

## Local setup

### Prerequisites

- Java 21+
- Node.js 18+
- Python 3 (for the dev launcher)
- A [Supabase](https://supabase.com) project with the schema below
- An [Anthropic API key](https://console.anthropic.com)

### Environment variables

Create a `.env` file in the project root:

```env
SUPABASE_URL=jdbc:postgresql://<host>:5432/postgres
SUPABASE_USER=postgres.<project-ref>
SUPABASE_PASSWORD=your-password
ANTHROPIC_API_KEY=sk-ant-...
```

### Database schema

Run in the Supabase SQL editor:

```sql
CREATE TABLE problems (
  id          BIGSERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  constraints TEXT[],
  difficulty  TEXT NOT NULL,
  starter_code TEXT
);

CREATE TABLE sessions (
  id                   TEXT PRIMARY KEY,
  level                TEXT,
  plan_summary         TEXT,
  resume_text          TEXT,
  phase                TEXT,
  problem_id           BIGINT REFERENCES problems(id),
  hint_count           INT DEFAULT 0,
  conversation_history JSONB,
  debrief_report       JSONB
);
```

### Run

```bash
python dev.py
```

This starts both servers and loads `.env` automatically.

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:8080 |

Or start them separately:

```bash
# Terminal 1
cd backend && ./mvnw spring-boot:run

# Terminal 2
cd frontend && npm run dev
```

> **Voice support** requires Chrome or Edge — the Web Speech API is not available in Firefox or Safari.
