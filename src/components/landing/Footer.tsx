'use client'

import { Hospital, Globe, Mail, MessageSquare, Share2 } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

export function Footer() {
  const t = useTranslations('landing.footer')

  return (
    <footer className="bg-white dark:bg-slate-950 pt-24 pb-12 border-t border-slate-100 dark:border-slate-900 relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-20">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-6 group">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-none">
                <Hospital className="text-white w-6 h-6" />
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">SmileCare</span>
            </Link>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed mb-8">
              {t('desc')}
            </p>
            <div className="flex gap-4">
              {[Globe, Mail, MessageSquare, Share2].map((Icon, i) => (
                <a key={i} href="#" className="w-10 h-10 bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl flex items-center justify-center transition-all">
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-6 uppercase text-xs tracking-widest">{t('product')}</h4>
            <ul className="space-y-4">
              <li><Link href="#features" className="text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors text-sm font-medium">{t('features')}</Link></li>
              <li><Link href="#pricing" className="text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors text-sm font-medium">{t('pricing')}</Link></li>
              <li><a href="#" className="text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors text-sm font-medium">{t('demo')}</a></li>
              <li><a href="#" className="text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors text-sm font-medium">{t('updates')}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-6 uppercase text-xs tracking-widest">{t('company')}</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors text-sm font-medium">{t('about')}</a></li>
              <li><a href="#" className="text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors text-sm font-medium">{t('careers')}</a></li>
              <li><a href="#" className="text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors text-sm font-medium">{t('blog')}</a></li>
              <li><a href="#" className="text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors text-sm font-medium">{t('contact')}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-6 uppercase text-xs tracking-widest">{t('legal')}</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors text-sm font-medium">{t('privacy')}</a></li>
              <li><a href="#" className="text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors text-sm font-medium">{t('terms')}</a></li>
              <li><a href="#" className="text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors text-sm font-medium">{t('security')}</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-50 dark:border-slate-900/50 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-slate-400 dark:text-slate-500 text-sm">
            {t('rights')}
          </p>
          <div className="flex gap-8">
            <a href="#" className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-400 text-xs font-medium transition-colors">{t('privacyPolicy')}</a>
            <a href="#" className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-400 text-xs font-medium transition-colors">{t('termsOfService')}</a>
            <a href="#" className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-400 text-xs font-medium transition-colors">{t('cookiePolicy')}</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
