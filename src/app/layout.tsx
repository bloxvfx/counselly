import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, JetBrains_Mono } from "next/font/google";
import { SmoothScroll } from "@/components/layout/smooth-scroll";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sapientia — Your Personal College Counsellor",
  description:
    "AI-powered college counselling for every Indian student. Get the guidance, clarity, and roadmap that was once only available to the privileged few.",
  icons: {
    icon: [{ url: "/Sapientia.svg", type: "image/svg+xml" }],
    apple: "/Sapientia.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${inter.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-canvas text-body">
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
