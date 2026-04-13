# ColorGifts Workspace

## Overview

pnpm workspace monorepo using TypeScript. This project is **ColorGifts** — a web application that transforms personal photos into personalized printable coloring books.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/colorgifts)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI gpt-image-1 via Replit AI Integrations
- **Storage**: Google Cloud Storage (Replit Object Storage)
- **Auth**: Clerk (white-label, auto-provisioned keys)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Database Schema

- **books** — coloring book records (title, style, status, cover image, share token)
- **photos** — uploaded user photos (object path, file name, book association)
- **coloring_pages** — generated coloring pages (original and coloring image paths, status)

## User Flow

1. Landing page → Click "Start Gifting"
2. Create book wizard: Title/style → Upload photos → Generate
3. AI transforms photos into B&W line art coloring pages
4. Preview results, regenerate individual pages
5. Checkout: PDF download ($9.99) or printed book ($19.99)
6. Share confirmation page with referral link

## Features

- Photo upload via presigned GCS URLs (drag & drop, multiple files)
- AI coloring page generation using OpenAI gpt-image-1
- Three style options: Simple (ages 3-5), Cartoon (ages 5-8), Detailed (adults)
- Preview gallery with side-by-side comparison
- Book builder with title, subtitle, dedication
- Status tracking: draft → generating → ready → ordered
- Share token for viral referral loop

## Architecture Notes

- All images served via `/api/storage/objects/{objectPath}`
- AI generation runs in background after `/books/:id/generate` call
- Frontend polls for status updates during generation
- OpenAI integration via Replit AI Integrations (no user API key needed)
