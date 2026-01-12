import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FormPick - 운동 웹앱",
  description: "운동을 기록하고 관리하는 웹앱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
