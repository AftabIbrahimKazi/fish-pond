import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fish Pond — Visual Telemetry Benchmark",
  description: "Side-by-side visual comparison of three fish control architectures: programmed reflex, preset lottery, and dual-process reasoning.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
