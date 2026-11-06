import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Code_Pro, Source_Sans_3 } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const sourceSans = Source_Sans_3({ variable: "--font-source-sans", subsets: ["latin"] });
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
    <html lang="en" suppressHydrationWarning className={`${sourceSans.variable} ${sourceCode.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full">
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
