# Strata — Scientific Data Workspace

A modern, web-based scientific data analysis platform (a ground-up rebuild of
the v1 CSV parser). Inspired by the workflow of tools like OriginLab/JMP but
delivered as a clean, OneDrive-style web app.

## What's here

- **Workspaces** — OneDrive-/docs-style landing page. Each workspace holds one
  or more datasets and persists in the browser (localStorage).
- **Data import** — drag-and-drop CSV/TSV with automatic delimiter detection,
  header detection and per-column type inference. (Connectors for Sheets / SQL /
  instrument APIs are stubbed for a future server-backed release.)
- **Four core tools**, each backed by a real statistics engine:
  - **Overview** — dataset summary + per-column stats + Pearson correlation matrix
  - **Statistics** — mean/median/std/SEM/variance/quartiles/IQR/skew/kurtosis/CV,
    histogram and box plot
  - **Outliers** — IQR (Tukey), Z-score and modified Z-score (MAD) methods with
    a bounded scatter plot and a flagged-values table
  - **Trends** — OLS linear regression with R², moving average and Mann–Kendall τ
  - **Visualize** — chart builder (line/scatter/bar/histogram/box) with curve
    fitting (linear / polynomial) and high-res PNG export

## Stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS v3
- ECharts (scientific charts + PNG export)
- Zustand (state, persisted to localStorage)

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm run start   # production
```

## Note on the project path (important)

This repo lives under a folder containing `#` (`app#1-data_parsing`). **Tailwind
CSS v4 cannot resolve paths that contain `#`** (it treats `#` as a URL fragment),
which breaks both `dev` and `build`. This project therefore uses **Tailwind v3**,
which resolves paths normally and works from this location. If you ever move the
project to a `#`-free path you may upgrade to Tailwind v4 if desired.
