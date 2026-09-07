import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import { WorkspaceShell } from "@/components/workspace/shell";
import { Toaster } from "sonner";
import "./globals.css";
const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Lora({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
export const metadata: Metadata = {
  title: {
    default: "WeGarden — A little care. A lot of possibility.",
    template: "%s — WeGarden",
  },
  description:
    "Your everyday garden companion. Plan beautiful beds, discover plants, and grow a little every day.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} ${display.variable} antialiased`}
    >
      <body>
        <WorkspaceShell>{children}</WorkspaceShell>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
