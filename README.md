# Retail Shop Inventory

![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=111111)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=ffffff)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=ffffff)
![Supabase](https://img.shields.io/badge/Supabase-Ready-3ECF8E?style=for-the-badge&logo=supabase&logoColor=ffffff)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

Retail Shop Inventory is a modern inventory, billing, and reporting dashboard for small and medium retail shops. It helps shop owners manage products, track stock, generate bills, monitor sales, and optionally sync data with Supabase.

## Live Output

View the deployed project here:

**[https://nilsportshop.netlify.app/](https://nilsportshop.netlify.app/)**

## Highlights

- Manage inventory with product names, categories, brands, prices, sizes, images, and stock levels
- Create bills with cart management and printable receipts
- Track low-stock products and restock items quickly
- View sales, profit, and transaction reports
- Store data locally in the browser when cloud sync is not configured
- Sync settings, inventory, and transactions with Supabase
- Generate AI-assisted product details, supplier emails, and social post drafts
- Switch between light and dark dashboard modes

## Tech Stack

| Tool | Purpose |
| --- | --- |
| React 18 | Frontend UI |
| Vite | Development and production build |
| Tailwind CSS | Styling |
| Supabase | Optional cloud database sync |
| Lucide React | Icons |
| Netlify | Deployment |

## Project Structure

```text
retail-shop-inventory/
|-- src/
|   |-- InventoryApp.jsx
|   |-- main.jsx
|   `-- lib/
|       |-- appData.js
|       |-- defaultData.js
|       `-- supabase.js
|-- supabase/
|   `-- schema.sql
|-- SUPABASE_SETUP.md
|-- netlify.toml
`-- package.json
```

## Getting Started

Install dependencies:

```bash
npm install
```

Create an environment file:

```bash
cp .env.example .env
```

Start the development server:

```bash
npm run dev
```

## Environment Variables

Add these values to `.env` when you want Supabase sync or AI features:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GEMINI_API_KEY=
VITE_GEMINI_MODEL=
```

Supabase is optional. If it is not configured, the app continues working with local browser storage.

## Supabase Setup

1. Create a Supabase project.
2. Run the SQL from [`supabase/schema.sql`](./supabase/schema.sql).
3. Add the Supabase URL and anon key to `.env`.
4. Restart the Vite dev server.

More details are available in [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md).

## Build

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## License

This project is licensed under the [MIT License](./LICENSE).
