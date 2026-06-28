'use client'

import { Hospital, Users, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { motion, Variants } from 'framer-motion'

export function HowItWorks() {
  const t = useTranslations('landing.howItWorks')

  const steps = [
    {
      id: "step1",
      title: t('step1Title'),
      description: t('step1Desc'),
      icon: Hospital,
      color: "from-blue-600 to-blue-500",
      shadow: "shadow-blue-500/30",
      glow: "bg-blue-500"
    },
    {
      id: "step2",
      title: t('step2Title'),
      description: t('step2Desc'),
      icon: Users,
      color: "from-indigo-600 to-indigo-500",
      shadow: "shadow-indigo-500/30",
      glow: "bg-indigo-500"
    },
    {
      id: "step3",
      title: t('step3Title'),
      description: t('step3Desc'),
      icon: Sparkles,
      color: "from-emerald-500 to-emerald-400",
      shadow: "shadow-emerald-500/30",
      glow: "bg-emerald-500"
    }
  ]

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3
      }
    }
  }

  const stepVariants: Variants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, type: "spring", bounce: 0.4 } }
  }

  return (
    <section id="how-it-works" className="py-24 lg:py-32 bg-white dark:bg-slate-900 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 dark:opacity-50"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20 lg:mb-32 max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-sm font-bold text-slate-700 dark:text-slate-300 mb-6">
            <Sparkles className="w-4 h-4 text-indigo-500" />
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

        <div className="relative max-w-5xl mx-auto">
          {/* Animated Connecting Line (Desktop) */}
          <div className="hidden lg:block absolute top-16 left-[10%] right-[10%] h-1 -z-10">
            {/* Background Track */}
            <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
            {/* Animated Gradient Line */}
            <motion.div 
              initial={{ scaleX: 0, opacity: 0 }}
              whileInView={{ scaleX: 1, opacity: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.5, ease: "easeInOut", delay: 0.2 }}
              className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-full origin-left rtl:origin-right"
            ></motion.div>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid lg:grid-cols-3 gap-16 lg:gap-8"
          >
            {steps.map((step, index) => (
              <motion.div variants={stepVariants} key={step.id} className="relative flex flex-col items-center text-center group">
                <div className="relative mb-10">
                  {/* Outer glow */}
                  <div className={`absolute inset-0 ${step.glow} rounded-[2rem] blur-xl opacity-0 group-hover:opacity-40 dark:group-hover:opacity-20 transition-opacity duration-500`}></div>
                  
                  {/* Icon Container */}
                  <div className={`w-32 h-32 bg-gradient-to-br ${step.color} text-white rounded-[2.5rem] flex items-center justify-center relative shadow-xl ${step.shadow} dark:shadow-none group-hover:-translate-y-2 group-hover:scale-105 transition-all duration-500 z-10 border border-white/20`}>
                    <step.icon className="w-12 h-12" />
                    
                    {/* Number Badge */}
                    <div className="absolute -top-3 -right-3 w-12 h-12 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-full flex items-center justify-center font-black text-xl shadow-lg border border-slate-100 dark:border-slate-700 group-hover:scale-110 transition-transform duration-500 group-hover:rotate-12">
                      {index + 1}
                    </div>
                  </div>
                </div>
                
                <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-4 transition-colors">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
                    {step.title}
                  </span>
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed max-w-sm">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
