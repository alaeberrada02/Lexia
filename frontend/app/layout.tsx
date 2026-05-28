import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LexIA - Assistant juridique RAG",
  description: "Assistant juridique intelligent pour interroger vos documents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
