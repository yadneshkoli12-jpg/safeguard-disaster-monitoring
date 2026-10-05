import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "Safeguard — Disaster Awareness & Preparedness",
  description: "Source-backed weather, disaster monitoring, and practical preparedness information. Data coverage and limitations are clearly labeled.",
  applicationName: "Safeguard",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
