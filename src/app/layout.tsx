import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";

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
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full bg-base text-fg">
        <ThemeProvider />
        {children}
      </body>
    </html>
  );
}
