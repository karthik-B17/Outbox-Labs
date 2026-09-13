# Outbox Labs — Full-Stack Email Job Scheduler

A production-oriented email scheduling service and dashboard built for the ReachInbox Software Development Intern Assignment.

Outbox Labs demonstrates reliable email scheduling using BullMQ and Redis, persistent job processing, configurable rate limiting, multi-sender support, and a modern Next.js dashboard.

## Table of Contents

* [Overview](#overview)
* [Features](#features)
* [Architecture](#architecture)
* [How It Works](#how-it-works)
* [Tech Stack](#tech-stack)
* [Project Structure](#project-structure)
* [Getting Started](#getting-started)
* [Environment Variables](#environment-variables)
* [API Endpoints](#api-endpoints)
* [Frontend](#frontend)
* [Reliability and Scalability](#reliability-and-scalability)
* [Assignment Requirements](#assignment-requirements)
* [Trade-offs](#trade-offs)
* [Demo](#demo)
* [Author](#author)

## Overview

Outbox Labs is a full-stack email job scheduler that allows users to compose emails, upload recipient lists, schedule messages for a future time, and monitor the status of scheduled and sent emails.

The system is designed around a persistent job queue rather than cron jobs. BullMQ and Redis handle delayed job scheduling, while PostgreSQL stores application data and Prisma provides database access. Ethereal Email is used as a fake SMTP provider for testing and previewing email delivery.

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/11aca69d-e57d-4fff-9177-8df2352492d1" />
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/7e393e85-211b-4ac4-988c-5ff045a24a98" />
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/dffb3cf4-cd8e-44fa-a3f1-4acfd346a4bd" />




### Core objectives

* Schedule and send emails reliably.
* Persist email and job data across server restarts.
* Support configurable worker concurrency and provider-style throttling.
* Enforce per-sender hourly rate limits using Redis.
* Provide searchable email history through Elasticsearch.
* Offer a clean dashboard with Google OAuth authentication.

## Features

### Backend

* Express.js with TypeScript.
* BullMQ delayed job scheduling backed by Redis.
* PostgreSQL with Prisma ORM.
* Ethereal Email SMTP integration.
* Elasticsearch indexing and email search.
* Redis-backed per-sender hourly rate limiting.
* Configurable worker concurrency and minimum send delay.
* Slack webhook notifications when a sender reaches the hourly limit.
* Google OAuth and email/password authentication.
* CSV parsing and recipient extraction.
* Queue statistics and job monitoring endpoints.

### Frontend

* Next.js 14, TypeScript, and Tailwind CSS.
* Google OAuth login and user profile display.
* Dashboard with sidebar navigation.
* Scheduled Emails and Sent Emails views.
* Compose New Email page.
* Quick scheduling options and custom date/time selection.
* CSV upload with recipient count.
* Loading, empty, and basic error states.
* Responsive, mobile-first design.

## Architecture

The application follows a monorepo structure with a separate backend API, frontend dashboard, and Docker-based infrastructure.

```text
                         ┌──────────────────────┐
                         │   Next.js Frontend   │
                         │                      │
                         │ Login / Dashboard    │
                         │ Compose / Email List │
                         └──────────┬───────────┘
                                    │ REST API
                                    ▼
                         ┌──────────────────────┐
                         │ Express.js Backend   │
                         │      TypeScript      │
                         │                      │
                         │ Auth / Email Routes  │
                         │ Queue / CSV Routes   │
                         └───┬────────┬─────────┘
                             │        │
                ┌────────────┘        └─────────────┐
                ▼                                    ▼
       ┌────────────────┐                   ┌────────────────┐
       │  PostgreSQL    │                   │     Redis      │
       │                │                   │                │
       │ Users          │                   │ BullMQ Queue   │
       │ Emails         │                   │ Delayed Jobs   │
       │ Email Jobs     │                   │ Rate Counters  │
       └────────────────┘                   └───────┬────────┘
                                                     │
                                                     ▼
                                           ┌────────────────┐
                                           │ BullMQ Worker  │
                                           │                │
                                           │ Delay / Limit  │
                                           │ Send / Retry   │
                                           └───────┬────────┘
                                                   │
                                  ┌────────────────┼────────────────┐
                                  ▼                ▼                ▼
                         ┌────────────────┐ ┌──────────────┐ ┌──────────────┐
                         │ Ethereal SMTP │ │ Elasticsearch│ │ Slack Webhook│
                         │ Email Preview │ │ Search Index │ │ Notifications│
                         └────────────────┘ └──────────────┘ └──────────────┘
```

### Component responsibilities

| Component      | Responsibility                                                           |
| -------------- | ------------------------------------------------------------------------ |
| Next.js        | User interface, authentication flow, email composition, and dashboard.   |
| Express.js     | REST APIs, authentication, validation, scheduling, and queue management. |
| PostgreSQL     | Persistent storage for users, emails, and email jobs.                    |
| Prisma         | Type-safe ORM for PostgreSQL.                                            |
| Redis          | BullMQ job storage and rate-limit counters.                              |
| BullMQ         | Delayed job scheduling and worker processing.                            |
| Worker         | Processes email jobs and sends emails through SMTP.                      |
| Ethereal Email | Fake SMTP provider for testing email delivery.                           |
| Elasticsearch  | Indexes and searches email records.                                      |
| Slack          | Sends notifications when hourly sender limits are reached.               |

## How It Works

### 1. User authentication

A user logs in through Google OAuth or email/password authentication.

The backend authenticates the user, creates or retrieves the associated database record, and returns the authentication result to the frontend. The dashboard then displays the user's name, email, and avatar.

### 2. Compose and upload recipients

The user opens Compose New Email and enters:

* Subject
* Email body
* Recipient list
* Start time
* Delay between emails
* Hourly sending limit

Recipients can be uploaded as a CSV file. The backend parses the file using `csv-parse` and extracts the email addresses.

### 3. Schedule the email

When the user clicks Schedule, the frontend sends the request to the backend.

The backend stores the email and job metadata in PostgreSQL, then creates a delayed BullMQ job using `emailQueue.add()`.

```typescript
await emailQueue.add(
  "send-email",
  {
    emailId,
    senderId,
  },
  {
    delay: delayInMilliseconds,
  }
);
```

BullMQ stores the delayed job in Redis. The worker does not need to run a cron job to discover scheduled emails.

### 4. Process the job

When the scheduled delay expires, the BullMQ worker receives the job.

The worker:

1. Retrieves the email record.
2. Checks the sender's hourly rate limit.
3. Enforces the minimum delay between sends.
4. Sends the email using Ethereal SMTP.
5. Updates the email status in PostgreSQL.
6. Indexes the email in Elasticsearch.
7. Handles rate-limit rescheduling when necessary.

### 5. Rate limiting and throttling

Each sender has a configurable hourly email limit. Redis-backed counters track usage by sender and hour window.

When the limit is reached, the system reschedules the job for the next available hour window instead of permanently failing or dropping it. A Slack webhook notification is sent when a sender reaches the limit, provided Slack is connected.

The minimum send delay and worker concurrency are configurable through environment variables.

### 6. Search and dashboard

Email records are indexed in Elasticsearch after processing. The search service provides `indexEmail()` and `searchEmails()` functionality.

The frontend dashboard displays scheduled and sent email data through the backend API.

## Tech Stack

| Layer          | Technologies                    |
| -------------- | ------------------------------- |
| Backend        | Node.js, Express.js, TypeScript |
| Database       | PostgreSQL, Prisma ORM          |
| Queue          | BullMQ, Redis                   |
| Email          | Nodemailer, Ethereal Email      |
| Search         | Elasticsearch                   |
| Authentication | Passport.js, Google OAuth, JWT  |
| Frontend       | Next.js 14, React, TypeScript   |
| Styling        | Tailwind CSS                    |
| Infrastructure | Docker Compose                  |
| Notifications  | Slack Webhooks                  |
| CSV            | csv-parse                       |

## Project Structure

```text
Outbox-Labs/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config/
│   │   │   ├── elastic.ts
│   │   │   ├── index.ts
│   │   │   └── redis.ts
│   │   ├── middleware/
│   │   │   └── auth.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── emails.ts
│   │   │   └── queue.ts
│   │   ├── services/
│   │   │   ├── emailService.ts
│   │   │   ├── rateLimiter.ts
│   │   │   ├── scheduler.ts
│   │   │   └── slackService.ts
│   │   └── index.ts
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── auth/
│   │   │   └── dashboard/
│   │   │       ├── compose/
│   │   │       ├── scheduled/
│   │   │       └── sent/
│   │   ├── components/
│   │   │   └── Sidebar.tsx
│   │   └── ...
│   ├── package.json
│   └── .env.example
├── docker-compose.yml
└── README.md
```

## Getting Started

### Prerequisites

* Node.js 18 or later.
* npm.
* Docker Desktop.
* A Google OAuth application.
* An Ethereal Email test account.
* Elasticsearch, either through Docker or a compatible instance.
* A Slack webhook for notifications.

### 1. Clone the repository

```bash
git clone https://github.com/karthik-B17/Outbox-Labs.git
cd Outbox-Labs
```

### 2. Start infrastructure

The Docker Compose file starts PostgreSQL, Redis, and Elasticsearch.

```bash
docker compose up -d
```

Verify the services are running:

```bash
docker compose ps
```

### 3. Install backend dependencies

```bash
cd backend
npm install
```

### 4. Configure backend environment

Copy the example environment file:

```bash
copy .env.example .env
```

On macOS/Linux:

```bash
cp .env.example .env
```

Update the values in `.env` using the environment variable reference below.

### 5. Run Prisma migrations

```bash
npx prisma generate
npx prisma migrate dev
```

### 6. Start the backend

```bash
npm run dev
```

The backend runs on the port configured in `PORT`, typically `3000`.

### 7. Install frontend dependencies

Open a new terminal:

```bash
cd frontend
npm install
```

### 8. Configure frontend environment

```bash
copy .env.example .env.local
```

On macOS/Linux:

```bash
cp .env.example .env.local
```

Set the backend API URL and other frontend configuration values.

### 9. Start the frontend

```bash
npm run dev
```

The frontend runs on the port configured by the Next.js application, typically `3001` for this project.

## Environment Variables

### Backend

The following variables represent the configuration used by the application. Use the exact names and defaults in the actual `.env.example` file when setting up the repository.

```env
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://postgres:password@localhost:5432/outbox_labs

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

ELASTICSEARCH_URL=http://localhost:9200

FRONTEND_URL=http://localhost:3001

JWT_SECRET=your_jwt_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

ETHEREAL_USER=
ETHEREAL_PASSWORD=

SLACK_WEBHOOK_URL=

WORKER_CONCURRENCY=5
MIN_EMAIL_DELAY_MS=2000
MAX_EMAILS_PER_HOUR_PER_SENDER=200
```

### Frontend

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Ethereal Email setup

1. Open <Link url="https://ethereal.email/" title="Ethereal Email"/>.
2. Create a test account.
3. Copy the SMTP username and password.
4. Add the credentials to the backend environment.
5. Restart the backend.

Ethereal is a fake SMTP provider. Emails are not delivered to real inboxes; use the preview URL returned by Nodemailer to inspect test messages.

## API Endpoints

The following endpoints are implemented in the backend routes.

### Authentication

| Method | Endpoint                    | Description                       |
| ------ | --------------------------- | --------------------------------- |
| GET    | `/api/auth/google`          | Start Google OAuth login.         |
| GET    | `/api/auth/google/callback` | Handle Google OAuth callback.     |
| POST   | `/api/auth/register`        | Register with email/password.     |
| POST   | `/api/auth/login`           | Authenticate with email/password. |

### Email scheduling

| Method | Endpoint                | Description                     |
| ------ | ----------------------- | ------------------------------- |
| POST   | `/api/emails/schedule`  | Create and schedule email jobs. |
| POST   | `/api/emails/parse-csv` | Parse a CSV recipient list.     |
| GET    | `/api/emails/scheduled` | Retrieve scheduled emails.      |
| GET    | `/api/emails/sent`      | Retrieve sent emails.           |
| GET    | `/api/emails/search`    | Search indexed emails.          |

### Queue monitoring

| Method | Endpoint           | Description                |
| ------ | ------------------ | -------------------------- |
| GET    | `/api/queue/stats` | Retrieve queue statistics. |
| GET    | `/api/queue/jobs`  | Retrieve queue jobs.       |

**Note:** The endpoint prefixes above are illustrative. Verify the final route prefixes in `backend/src/index.ts` and the route files before submitting.

## Frontend

The dashboard provides the following user flows:

### Dashboard

The dashboard includes sidebar navigation, user profile information, scheduled email counts, and sent email counts.

### Compose New Email

Users can compose an email, upload a CSV recipient list, choose a quick scheduling time, or select a custom date and time.

### Scheduled Emails

Displays the email address, subject, scheduled time, and current status.

### Sent Emails

Displays the email address, subject, sent time, and status.

### UX

Loading spinners, empty states, and basic error messages are implemented across the dashboard pages.

## Reliability and Scalability

### Persistent delayed jobs

BullMQ stores delayed jobs in Redis. The email records and job metadata are stored in PostgreSQL. This allows future scheduled jobs to remain available when the backend restarts.

The scheduler uses BullMQ delayed jobs rather than cron jobs.

### Worker concurrency

Worker concurrency is configurable. The default configuration is five concurrent jobs, allowing the worker to process multiple jobs in parallel.

### Minimum delay

A minimum two-second delay is configured between email sends to simulate provider throttling.

### Per-sender rate limiting

Redis-backed counters enforce the hourly email limit for each sender. When a sender reaches the limit, the job is rescheduled for the next available hour window.

### High-volume scheduling

BullMQ is used to queue large numbers of scheduled jobs. Multiple workers can share the same Redis queue, allowing the system to scale beyond a single worker instance.

### Idempotency

The email job stores its associated email record in PostgreSQL. The worker uses the email status to avoid processing already completed email records again.

## Assignment Requirements

| Requirement                            | Implementation                         |
| -------------------------------------- | -------------------------------------- |
| Express.js + TypeScript backend        | `backend/src/index.ts`                 |
| BullMQ delayed scheduling              | `backend/src/services/scheduler.ts`    |
| PostgreSQL + Prisma                    | `backend/prisma/schema.prisma`         |
| Ethereal SMTP                          | `backend/src/services/emailService.ts` |
| Elasticsearch search                   | `indexEmail()` and `searchEmails()`    |
| Redis rate limiting                    | `backend/src/services/rateLimiter.ts`  |
| Configurable concurrency               | Worker configuration                   |
| Slack notifications                    | `backend/src/services/slackService.ts` |
| Google OAuth + password authentication | `backend/src/routes/auth.ts`           |
| CSV parsing                            | `/parse-csv` endpoint                  |
| Queue dashboard                        | `backend/src/routes/queue.ts`          |
| Next.js + TypeScript + Tailwind        | `frontend/`                            |
| Google OAuth frontend flow             | `auth/callback/page.tsx`               |
| Dashboard navigation                   | `Sidebar.tsx`                          |
| Scheduled and sent views               | Dashboard pages                        |
| Compose page                           | `dashboard/compose/page.tsx`           |
| Quick scheduling                       | Compose page                           |
| CSV recipient upload                   | Compose page                           |
| Loading and empty states               | Dashboard components                   |
| Responsive design                      | Tailwind CSS                           |
| Restart persistence                    | Redis and PostgreSQL                   |
| Docker infrastructure                  | `docker-compose.yml`                   |

## Trade-offs

### Ethereal Email

Ethereal Email is used instead of a production SMTP provider. Messages can be previewed but are not delivered to real recipients.

### Single worker instance

The current setup runs a single worker instance. Horizontal scaling can be introduced by running multiple workers connected to the same Redis queue.

### In-memory sessions

The current authentication session implementation uses in-memory session storage. A production deployment should use a persistent Redis-backed session store.

### No attachments

The current implementation supports CSV recipient uploads but does not include email attachments.

## Demo

The demo should cover:

1. Google OAuth login.
2. Composing a new email.
3. Uploading a CSV recipient list.
4. Scheduling an email for a future time.
5. Viewing scheduled emails.
6. Viewing sent emails and Ethereal previews.
7. Stopping and restarting the backend.
8. Verifying that future scheduled jobs are retained.
9. Demonstrating rate limiting and Slack notification behavior.

## Author

**Karthik B**

B.Tech (Hons) Electronics and Communication Engineering

KL University, Hyderabad

GitHub: [karthik-B17](https://github.com/karthik-B17)

Repository: [Outbox-Labs](https://github.com/karthik-B17/Outbox-Labs)
