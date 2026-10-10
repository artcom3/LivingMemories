import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LivingMemories, el diario de tu familia",
  description:
    "Guarda la voz de tus mayores y conviértela en cuentos ilustrados y narrados para tus hijos y nietos. Piloto privado por invitación.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
