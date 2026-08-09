import type { Metadata } from "next";
import { Montserrat, Oswald } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
});

const oswald = Oswald({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-oswald",
});

export const metadata: Metadata = {
  title: "Virtual Run Beard",
  description: "Platform operasional event virtual run untuk Indonesia.",
  icons: {
    icon: [
      { url: "/assets/logo/BEARD CIRCLE LOGO.svg", type: "image/svg+xml" },
      { url: "/assets/logo/BEARD CIRCLE LOGO.png", type: "image/png" },
    ],
    apple: [{ url: "/assets/logo/BEARD CIRCLE LOGO.png" }],
  },
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="id">
      <body className={`${montserrat.variable} ${oswald.variable} font-sans`}>{children}</body>
    </html>
  );
}
