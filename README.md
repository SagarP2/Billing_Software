# Billing Software

A modern billing and invoicing application built with Next.js 14.

## Features

- User authentication (login/registration)
- Admin dashboard
- Invoice management
- Customer management
- Responsive UI with Tailwind CSS

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- PostgreSQL (Database)
- React Hook Form with Zod validation

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL (local)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/12princ/BillingSystem.git
cd billingsoftware
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Create `.env.local` with:
```
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/billingsystem
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
/src
  /app                 # Next.js App Router pages
  /components          # React components
    /auth              # Authentication components
    /dashboard         # Dashboard components
    /ui                # UI components
  /lib                 # Utility functions and hooks
```

## Local PostgreSQL setup (Windows)

1. Install PostgreSQL:
   - Download installer from `https://www.enterprisedb.com/downloads/postgres-postgresql-downloads`.
   - Run installer, keep the `postgres` password.
   - Ensure psql CLI is installed.

2. Create database and load schema:
   - Create DB:
     ```sql
     CREATE DATABASE billingsystem;
     ```
   - Import schema from repo root (PowerShell):
     ```powershell
     psql -U postgres -d billingsystem -f .\postgres_schema.sql
     ```

3. Install deps and run:
   ```powershell
   npm install
   npm run dev
   ```

Notes:
- App data CRUD uses PostgreSQL through `/api/*` routes.
- Supabase auth references exist in codebase but are not required for CRUD anymore.

```bash
npm run build
```

## License

MIT