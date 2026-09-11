import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { UIThemeProvider } from "./ui-theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Optrizo Offline LIS",
  description: "Local laboratory information system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-ui-theme="modern"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("optrizo-ui-theme");document.documentElement.dataset.uiTheme=t==="classic"||t==="windows98"?t:"modern";}catch(e){document.documentElement.dataset.uiTheme="modern";}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <UIThemeProvider>{children}</UIThemeProvider>
      </body>
    </html>
  );
}
