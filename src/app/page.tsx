import { redirect } from "next/navigation"
import { Navbar } from "@/components/landing/Navbar"
import { Hero } from "@/components/landing/Hero"
import { Features } from "@/components/landing/Features"
import { HowItWorks } from "@/components/landing/HowItWorks"
import { Stats } from "@/components/landing/Stats"
import { Pricing } from "@/components/landing/Pricing"
import { Footer } from "@/components/landing/Footer"

interface Props {
  searchParams: Promise<{ code?: string; type?: string }>
}

export default async function LandingPage({ searchParams }: Props) {
  const params = await searchParams

  // Supabase sends recovery link to Site URL (this page).
  // Intercept the ?code= param and forward to the reset-password page.
  if (params.code) {
    const qs = new URLSearchParams({ code: params.code }).toString()
    redirect(`/reset-password?${qs}`)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <Features />
        <HowItWorks />
        <Pricing />
      </main>
      <Footer />
    </div>
  )
}

