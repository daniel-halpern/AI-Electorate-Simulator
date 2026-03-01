import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Auth0Provider } from '@auth0/nextjs-auth0/client';
import SolanaProvider from "@/components/SolanaProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vox PopulAI - Electorate Simulator",
  description: "AI-powered electorate simulation and policy analysis engine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Auth0Provider>
          <SolanaProvider>
            {children}
          </SolanaProvider>
        </Auth0Provider>
      </body>
    </html>
  );
}
