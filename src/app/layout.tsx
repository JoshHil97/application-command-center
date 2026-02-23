import type { Metadata } from "next";
import { Manrope, IBM_Plex_Mono } from "next/font/google";
import { InspirationVerse } from "@/components/layout/inspiration-verse";
import { AuthProvider } from "@/components/providers/auth-provider";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Career Command | Job Application CRM",
  description: "Premium job application tracker with timelines, notes, reminders, documents and analytics.",
  icons: {
    icon: "/cross.svg",
    shortcut: "/cross.svg",
    apple: "/cross.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB">
      <body className={`${manrope.variable} ${plexMono.variable} pb-14`}>
        <AuthProvider>
          {children}
          <InspirationVerse />
        </AuthProvider>
      </body>
    </html>
  );
}
