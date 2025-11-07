# Personal Finance Spreadsheet

An interactive, spreadsheet-style web application for tracking income, expenses, and savings across a calendar year. The interface mirrors an Excel budgeting workbook while running entirely in the browser, making it easy to deploy to platforms such as Vercel.

## Features

- Annual view of monthly income, expense, and savings categories with automatic running totals.
- Inline editing for every cell with keyboard-friendly numeric inputs.
- One-click CSV export for sharing or opening the data in Excel/Google Sheets.
- Persistent storage via `localStorage` so changes survive across browser sessions.
- Quick-add buttons for income, expense, and savings rows plus category removal.
- Currency selector (USD/EUR/GBP/CAD) with localized formatting and savings-rate insight.

## Tech Stack

- [Next.js 14](https://nextjs.org/) with the App Router
- React 18 + TypeScript
- Modern CSS with glassmorphism styling

## Getting Started

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to use the sheet in development mode. Build and production preview with:

```bash
npm run build
npm start
```

Lint the codebase at any time with:

```bash
npm run lint
```

## Deployment

This project is ready for Vercel. Run

```bash
vercel deploy --prod
```

or integrate with a connected repository for automatic deployments.

## Project Structure

```
app/
  components/
    FinanceSheet.tsx   # Main spreadsheet experience
  globals.css          # Global styling
  layout.tsx           # Root layout
  page.tsx             # Page entry point
```

## Data Export

Click **Export CSV** to download your current sheet as `personal-finance-sheet.csv`. The file includes the category name, monthly values, and an annual total column so you can continue working in Excel if needed.
