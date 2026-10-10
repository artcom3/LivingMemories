import { Manrope } from "next/font/google";

// The landing's single typeface, shared with the pages that wear its art
// direction (the sign in page), so both load one font instance.
export const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
