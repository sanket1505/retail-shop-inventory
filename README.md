# Sports Shop Inventory

React inventory and billing dashboard for sports shops, with Supabase sync, low-stock tracking, reports, receipts, and AI-assisted product content.

## Features

- Inventory catalog with categories, brands, prices, stock levels, and product images
- Billing cart and printable receipts
- Low-stock alerts and restock workflow
- Sales, profit, and transaction reporting
- Local browser cache with optional Supabase cloud sync
- AI-assisted product details, supplier emails, and social post drafts
- Light and dark mode store dashboard

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- Supabase
- Lucide React

## Setup

Install dependencies:

```bash
npm install
```

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Add your Supabase and optional Gemini values, then start the app:

```bash
npm run dev
```

For Supabase setup details, see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).

## Build

```bash
npm run build
```
