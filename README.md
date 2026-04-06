# New Project

Basic full-stack Next.js starter with a frontend homepage and a backend API
route.

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Project Structure

- `src/app/page.tsx`: frontend homepage
- `src/app/api/health/route.ts`: backend API route
- `src/components/api-status.tsx`: client component that calls the API
- `src/app/globals.css`: base styling

## Run Locally

1. Install dependencies if needed:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open `http://localhost:3000`

The homepage will call `http://localhost:3000/api/health` to confirm the
backend is working.
