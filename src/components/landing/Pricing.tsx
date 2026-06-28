'use client'

import { Check, Sparkles, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { motion, Variants } from 'framer-motion'

export function Pricing() {
  const t = useTranslations('landing.pricing')

  const plans = [
    {
      id: "basic",
      name: t('basic.name'),
      price: t('basic.price'),
      description: t('basic.desc'),
      features: [
        t('basic.f1'),
        t('basic.f2'),
        t('basic.f3'),
        t('basic.f4'),
        t('basic.f5')
      ],
      cta: t('basic.cta'),
      popular: false
    },
    {
      id: "pro",
      name: t('pro.name'),
      price: t('pro.price'),
      description: t('pro.desc'),
      features: [
        t('pro.f1'),
        t('pro.f2'),
        t('pro.f3'),
        t('pro.f4'),
        t('pro.f5'),
        t('pro.f6')
      ],
      cta: t('pro.cta'),
      popular: true
    }
  ]

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  }

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, type: "spring", bounce: 0.4 } }
  }

  return (
    <section id="pricing" className="py-24 lg:py-32 bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-indigo-50 dark:from-indigo-900/10 to-transparent"></div>
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-sm font-bold text-slate-700 dark:text-slate-300 mb-6">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            {t('title')}
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white mb-6 leading-[1.15]">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
              {t('title')}
            </span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg md:text-xl leading-relaxed">
            {t('subtitle')}
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto items-center"
        >
          {plans.map((plan) => (
            <motion.div 
              variants={cardVariants}
              key={plan.id}
              whileHover={{ y: -10 }}
              className={`relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] p-10 lg:p-12 transition-all duration-300 group ${
                plan.popular 
                  ? 'border-0 scale-100 md:scale-105 z-10' 
                  : 'border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none hover:border-blue-200 dark:hover:border-blue-700/50'
              }`}
            >
              {plan.popular && (
                <>
                  {/* Premium Animated Border for Pro Plan */}
                  <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-b from-blue-400 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 p-[3px] -z-10">
                    <div className="absolute inset-0 bg-white dark:bg-slate-900 rounded-[calc(2.5rem-3px)] h-full w-full"></div>
                  </div>
                  {/* Outer Glow */}
                  <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/30 to-indigo-500/30 dark:from-blue-500/20 dark:to-indigo-500/20 rounded-[3rem] blur-2xl -z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 border border-blue-400/30">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    {t('pro.popularBadge')}
                  </div>
                </>
              )}

              <div className="mb-8 text-center md:text-start">
                <h3 className={`text-2xl font-bold mb-2 ${plan.popular ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400' : 'text-slate-900 dark:text-white'}`}>{plan.name}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base h-12 leading-relaxed">{plan.description}</p>
              </div>

              <div className="flex items-baseline justify-center md:justify-start gap-1 mb-8 pb-8 border-b border-slate-100 dark:border-slate-800">
                <span className="text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight">{plan.price}</span>
                <span className="text-slate-500 dark:text-slate-400 font-medium">/{t('month')}</span>
              </div>

              <ul className="space-y-5 mb-10">
                {plan.features.map((feature, fIndex) => (
                  <li key={fIndex} className="flex items-start gap-4 text-slate-700 dark:text-slate-300 font-medium text-start">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-sm ${
                      plan.popular ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors'
                    }`}>
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span className="leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>

              <button className={`w-full py-4 px-6 rounded-2xl font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                plan.popular 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xl shadow-blue-600/20 hover:shadow-blue-600/40 group-hover:-translate-y-1' 
                  : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 group-hover:-translate-y-1'
              }`}>
                {plan.cta}
                <ArrowRight className="w-4 h-4 rtl:-scale-x-100 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
              </button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
