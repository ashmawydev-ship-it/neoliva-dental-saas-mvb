import type { Metadata } from "next";
import { Inter, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { cookies } from "next/headers";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SmileCare — Dental Clinic Management",
  description: "Professional SaaS dental clinic management platform. Manage appointments, patients, billing, inventory and more.",
  keywords: ["dental", "clinic", "management", "SaaS", "dashboard", "healthcare"],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value || "en";
  const messages = await getMessages();
  const now = new Date();

  return (
    <html 
      lang={locale} 
      dir={locale === "ar" ? "rtl" : "ltr"} 
      className={`${inter.variable} ${ibmPlexSansArabic.variable} h-full`} 
      suppressHydrationWarning 
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={messages} now={now}>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
        <Toaster />
      </body>
    </html>
  );
}

