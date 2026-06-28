'use client'

import { ArrowRight, CheckCircle2, Hospital, Stethoscope, Sparkles, BarChart3, Users, Calendar } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { motion, Variants } from 'framer-motion'

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2
    }
  }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] } }
}

const floatingVariants: Variants = {
  animate: {
    y: [0, -15, 0],
    rotate: [0, 2, -2, 0],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
}

export function Hero() {
  const t = useTranslations('landing.hero')

  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-gradient-to-b from-white to-slate-50/80 dark:from-slate-950 dark:to-slate-900/90 min-h-screen flex items-center">
      {/* Premium Dynamic Background Orbs */}
      <div className="absolute inset-0 w-full h-full -z-10 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.3, 0.15],
            x: [0, 100, 0],
            y: [0, -50, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-400/30 dark:bg-blue-600/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.25, 0.1],
            x: [0, -100, 0],
            y: [0, 50, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-indigo-400/30 dark:bg-indigo-600/20 rounded-full blur-[140px] mix-blend-multiply dark:mix-blend-screen" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          className="absolute top-[20%] left-[40%] w-[40%] h-[40%] bg-cyan-300/20 dark:bg-cyan-700/20 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen" 
        />
      </div>

      {/* Floating 3D-like Dashboard Widgets (Abstract) */}
      <div className="absolute inset-0 w-full h-full -z-10 pointer-events-none hidden lg:block perspective-1000">
        <motion.div variants={floatingVariants} animate="animate" className="absolute top-[20%] left-[10%] p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl border border-white/50 dark:border-slate-700/50 shadow-2xl rotate-[-15deg]">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-2">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="w-20 h-2 bg-slate-200 dark:bg-slate-700 rounded-full mb-2"></div>
          <div className="w-14 h-2 bg-slate-100 dark:bg-slate-600 rounded-full"></div>
        </motion.div>
        
        <motion.div variants={floatingVariants} animate="animate" style={{ animationDelay: '2s' }} className="absolute bottom-[25%] right-[12%] p-5 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl border border-white/50 dark:border-slate-700/50 shadow-2xl rotate-[10deg]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full mb-2"></div>
              <div className="w-10 h-2 bg-slate-100 dark:bg-slate-600 rounded-full"></div>
            </div>
          </div>
          <div className="flex gap-1 items-end h-10 mt-2">
            <div className="w-3 bg-indigo-300 dark:bg-indigo-600 rounded-t-sm h-[40%]"></div>
            <div className="w-3 bg-indigo-400 dark:bg-indigo-500 rounded-t-sm h-[70%]"></div>
            <div className="w-3 bg-indigo-600 dark:bg-indigo-400 rounded-t-sm h-[100%]"></div>
          </div>
        </motion.div>

        <motion.div variants={floatingVariants} animate="animate" style={{ animationDelay: '1s' }} className="absolute top-[30%] right-[15%] p-3 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl border border-white/50 dark:border-slate-700/50 shadow-2xl rotate-[5deg]">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center max-w-4xl mx-auto"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-50/90 to-indigo-50/90 dark:from-blue-900/30 dark:to-indigo-900/30 backdrop-blur-md border border-blue-200/50 dark:border-blue-800/50 text-blue-700 dark:text-blue-300 text-sm font-bold mb-10 shadow-lg shadow-blue-500/10 dark:shadow-blue-900/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700 dark:from-blue-300 dark:to-indigo-300">
              {t('badge')}
            </span>
          </motion.div>
          
          <motion.h1 variants={itemVariants} className="text-5xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tight mb-8 leading-[1.15]">
            {t('titlePart1')}
            <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 inline-block relative mt-2">
              {t('titleHighlight')}
              <svg className="absolute w-full h-4 -bottom-2 left-0 text-blue-200/50 dark:text-blue-900/50 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round" />
              </svg>
            </span>
          </motion.h1>
          
          <motion.p variants={itemVariants} className="text-lg lg:text-xl text-slate-600 dark:text-slate-300 mb-14 max-w-2xl mx-auto leading-relaxed">
            {t('subtitle')}
          </motion.p>

          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-3xl mx-auto">
            {/* Owner Path */}
            <motion.div 
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="group relative p-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/70 dark:border-slate-700/70 rounded-3xl hover:border-blue-500/50 dark:hover:border-blue-400/50 hover:shadow-2xl hover:shadow-blue-500/15 dark:hover:shadow-blue-900/30 transition-all duration-300 text-start overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-100/50 to-transparent dark:from-blue-900/30 dark:to-transparent rounded-full blur-[40px] -z-10 group-hover:scale-150 transition-transform duration-700"></div>
              
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-500/30 dark:shadow-blue-900/50 group-hover:rotate-6 transition-transform duration-300">
                <Hospital className="text-white w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{t('clinicOwner')}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed min-h-[50px]">
                {t('clinicOwnerDesc')}
              </p>
              <Link 
                href="/create-clinic" 
                className="inline-flex items-center gap-2 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/25 dark:shadow-blue-900/40 group-hover:shadow-xl group-hover:shadow-blue-500/40 w-full justify-center group-hover:-translate-y-1"
              >
                {t('registerBtn')}
                <ArrowRight className="w-4 h-4 rtl:-scale-x-100 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            {/* Staff Path */}
            <motion.div 
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="group relative p-8 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/70 dark:border-slate-700/70 rounded-3xl hover:border-indigo-500/50 dark:hover:border-indigo-400/50 hover:shadow-2xl hover:shadow-indigo-500/15 dark:hover:shadow-indigo-900/30 transition-all duration-300 text-start overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-indigo-100/50 to-transparent dark:from-indigo-900/30 dark:to-transparent rounded-full blur-[40px] -z-10 group-hover:scale-150 transition-transform duration-700"></div>
              
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/30 dark:shadow-indigo-900/50 group-hover:-rotate-6 transition-transform duration-300">
                <Stethoscope className="text-white w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{t('staffMember')}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed min-h-[50px]">
                {t('staffMemberDesc')}
              </p>
              <Link 
                href="/staff/sign-in" 
                className="inline-flex items-center gap-2 text-sm font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-100 dark:border-indigo-800 px-6 py-3.5 rounded-xl transition-all w-full justify-center group-hover:shadow-lg group-hover:shadow-indigo-200/50 dark:group-hover:shadow-indigo-900/50 group-hover:-translate-y-1"
              >
                {t('staffBtn')}
                <ArrowRight className="w-4 h-4 rtl:-scale-x-100 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-16 flex flex-wrap justify-center items-center gap-x-8 gap-y-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2 bg-white/70 dark:bg-slate-900/70 px-5 py-2.5 rounded-full border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              {t('perk1')}
            </div>
            <div className="flex items-center gap-2 bg-white/70 dark:bg-slate-900/70 px-5 py-2.5 rounded-full border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              {t('perk2')}
            </div>
            <div className="flex items-center gap-2 bg-white/70 dark:bg-slate-900/70 px-5 py-2.5 rounded-full border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              {t('perk3')}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

