import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Strata — Scientific Data Workspace",
  description:
    "A modern workspace for scientific data analysis: statistics, outliers, trends, and publication-grade visualizations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-800">{children}</body>
    </html>
  );
}
