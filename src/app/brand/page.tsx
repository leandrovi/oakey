import type { Metadata } from "next";
import { ComponentsSection } from "./_components/components-section";
import { IconsSection } from "./_components/icons-section";
import { LogoSection } from "./_components/logo-section";
import { PaletteSection } from "./_components/palette-section";
import { TypographySection } from "./_components/typography-section";
import { VoiceSection } from "./_components/voice-section";

export const metadata: Metadata = { title: "Brand" };

export default function BrandPage() {
  return (
    <div className="space-y-16">
      <div>
        <p className="text-sm font-medium text-brass">Oakey brand guide</p>
        <h1 className="mt-1 font-heading text-4xl font-medium tracking-tight">An oak, growing.</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          One mark, one green, one editorial display face. Enough restraint to feel like a bank, enough warmth to feel
          like one you&apos;d actually choose.
        </p>
      </div>
      <LogoSection />
      <IconsSection />
      <PaletteSection />
      <TypographySection />
      <ComponentsSection />
      <VoiceSection />
    </div>
  );
}
