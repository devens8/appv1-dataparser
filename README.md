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
- **Analysis tools**, each backed by a real statistics engine (open the
  **Analyze** menu in a workspace to launch any of them, Prism/JMP-style):
  - **Charts** — scatter/line + distribution histogram, box plot and Pearson
    correlation matrix, with linear/polynomial fit, regression annotation,
    **log-scale axes** and high-res PNG export
  - **Curve Fit** — *nonlinear regression* (Levenberg–Marquardt) with a model
    library: **dose-response 4PL/5PL (EC50/IC50 + Hill slope)**, exponential
    growth/decay (half-life, doubling time), **Michaelis–Menten (Vmax/Km)**,
    logistic growth and Gaussian peaks. Reports parameter ± SE with 95% CI,
    derived quantities, R²/adjusted-R²/RMSE, a residuals plot, a 95% prediction
    band and an automatic model-comparison ranking.
  - **Statistics** — mean/median/std/SEM/variance/quartiles/IQR/skew/kurtosis/CV,
    histogram and box plot, plus per-column summary and publication report export
  - **Anomalies** — rolling z-score and two-sided CUSUM change-point detection
  - **Compare** — across datasets: group means ± SEM with error bars, box plots,
    **one-way ANOVA with η² + Bonferroni post-hoc**, pairwise **Welch t-test or
    Mann–Whitney U** (toggle), and per-group **D'Agostino–Pearson normality**
  - **Longitudinal** — track a variable's mean across datasets over time
  - **Data** — spreadsheet view with column-type badges
  - Outlier detection (IQR / Z-score / MAD) feeds Charts, Statistics & Anomalies

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
