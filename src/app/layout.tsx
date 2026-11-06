import type { Metadata, Viewport } from "next";
import { Fraunces, Libre_Franklin, Source_Code_Pro } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const libreFranklin = Libre_Franklin({ variable: "--font-libre-franklin", subsets: ["latin"] });
const sourceCode = Source_Code_Pro({ variable: "--font-source-code", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["opsz", "SOFT"] });

export const metadata: Metadata = {
  title: { default: "Oakey", template: "%s · Oakey" },
  description: "Banking for businesses that plan to stick around.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f5ef" },
    { media: "(prefers-color-scheme: dark)", color: "#111a16" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${libreFranklin.variable} ${sourceCode.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full">
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
