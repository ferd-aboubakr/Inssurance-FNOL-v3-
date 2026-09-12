import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AmbientOps | FNOL Copilot",
  description: "Human-in-the-loop insurance claims triage prototype",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
