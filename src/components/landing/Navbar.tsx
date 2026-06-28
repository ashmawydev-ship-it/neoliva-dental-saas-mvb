'use client'

import { useState, useEffect } from 'react'
import { Hospital, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { ThemeToggle } from '@/components/shared/ThemeToggle'

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const t = useTranslations('landing.nav')

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/90 dark:bg-slate-950/90 backdrop-blur-lg border-b border-slate-100 dark:border-slate-800 shadow-sm' : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <motion.div 
              whileHover={{ rotate: 10, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-none"
            >
              <Hospital className="text-white w-6 h-6" />
            </motion.div>
            <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">SmileCare</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors relative group">
              {t('features')}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link href="#how-it-works" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors relative group">
              {t('howItWorks')}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link href="#pricing" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors relative group">
              {t('pricing')}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
            <Link 
              href="/staff/sign-in" 
              className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors"
            >
              {t('staffSignIn')}
            </Link>
            <Link 
              href="/login" 
              className="text-sm font-semibold text-slate-900 dark:text-white hover:text-blue-600 transition-colors"
            >
              {t('ownerLogin')}
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link 
                href="/create-clinic" 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-200/50"
              >
                {t('registerClinic')}
              </Link>
            </motion.div>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 overflow-hidden"
          >
            <div className="px-4 py-6 space-y-4 flex flex-col">
              <Link href="#features" className="text-base font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600" onClick={() => setIsMobileMenuOpen(false)}>{t('features')}</Link>
              <Link href="#how-it-works" className="text-base font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600" onClick={() => setIsMobileMenuOpen(false)}>{t('howItWorks')}</Link>
              <Link href="#pricing" className="text-base font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600" onClick={() => setIsMobileMenuOpen(false)}>{t('pricing')}</Link>
              <hr className="border-slate-100 dark:border-slate-800" />
              <Link href="/staff/sign-in" className="text-base font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600" onClick={() => setIsMobileMenuOpen(false)}>{t('staffSignIn')}</Link>
              <Link href="/login" className="text-base font-semibold text-slate-900 dark:text-white hover:text-blue-600" onClick={() => setIsMobileMenuOpen(false)}>{t('ownerLogin')}</Link>
              <Link 
                href="/create-clinic" 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-center shadow-lg shadow-blue-200/50 dark:shadow-none mt-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('registerClinic')}
              </Link>
              <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
                <ThemeToggle />
                <LanguageSwitcher />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
