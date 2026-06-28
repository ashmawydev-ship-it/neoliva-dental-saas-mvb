'use client'

import { 
  Users, 
  Calendar, 
  CreditCard, 
  Package, 
  ChevronRight,
  Sparkles
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { motion, Variants } from 'framer-motion'

export function Features() {
  const t = useTranslations('landing.features')

  const features = [
    {
      id: "f1",
      title: t('f1Title'),
      description: t('f1Desc'),
      icon: Calendar,
      color: "from-indigo-500 to-indigo-600",
      shadow: "shadow-indigo-500/30",
      bgClass: "bg-gradient-to-br from-indigo-50/80 to-white dark:from-indigo-900/20 dark:to-slate-900/80",
      borderClass: "border-indigo-100 dark:border-indigo-800/50 hover:border-indigo-300 dark:hover:border-indigo-500/50",
      colSpan: "md:col-span-2 lg:col-span-1" // Regular card
    },
    {
      id: "f2",
      title: t('f2Title'),
      description: t('f2Desc'),
      icon: Users,
      color: "from-blue-500 to-blue-600",
      shadow: "shadow-blue-500/30",
      bgClass: "bg-gradient-to-br from-blue-50/80 to-white dark:from-blue-900/20 dark:to-slate-900/80",
      borderClass: "border-blue-100 dark:border-blue-800/50 hover:border-blue-300 dark:hover:border-blue-500/50",
      colSpan: "md:col-span-2 lg:col-span-2" // Wide card
    },
    {
      id: "f3",
      title: t('f3Title'),
      description: t('f3Desc'),
      icon: CreditCard,
      color: "from-emerald-500 to-emerald-600",
      shadow: "shadow-emerald-500/30",
      bgClass: "bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-900/20 dark:to-slate-900/80",
      borderClass: "border-emerald-100 dark:border-emerald-800/50 hover:border-emerald-300 dark:hover:border-emerald-500/50",
      colSpan: "md:col-span-2 lg:col-span-2" // Wide card
    },
    {
      id: "f4",
      title: t('f4Title'),
      description: t('f4Desc'),
      icon: Package,
      color: "from-violet-500 to-violet-600",
      shadow: "shadow-violet-500/30",
      bgClass: "bg-gradient-to-br from-violet-50/80 to-white dark:from-violet-900/20 dark:to-slate-900/80",
      borderClass: "border-violet-100 dark:border-violet-800/50 hover:border-violet-300 dark:hover:border-violet-500/50",
      colSpan: "md:col-span-2 lg:col-span-1" // Regular card
    }
  ]

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  }

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] } }
  }

  return (
    <section id="features" className="py-24 md:py-32 bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      {/* Decorative Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-sm font-bold text-slate-700 dark:text-slate-300 mb-6">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span>{t('title')}</span>
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
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div 
              key={feature.id}
              variants={cardVariants}
              whileHover={{ y: -8, scale: 1.01 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={`group relative p-8 md:p-10 rounded-[2.5rem] border backdrop-blur-xl shadow-xl shadow-slate-200/40 dark:shadow-none transition-all duration-300 ${feature.bgClass} ${feature.borderClass} ${feature.colSpan} overflow-hidden`}
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/50 dark:bg-slate-800/50 rounded-full blur-[80px] -z-10 opacity-50 dark:opacity-20 group-hover:opacity-100 dark:group-hover:opacity-40 transition-opacity duration-500 group-hover:scale-150"></div>
              
              <div className="flex flex-col h-full justify-between relative z-10">
                <div>
                  <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} ${feature.shadow} shadow-lg rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                    <feature.icon className="text-white w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{feature.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed mb-8">
                    {feature.description}
                  </p>
                </div>
                
                <div className="mt-auto pt-6 border-t border-slate-200/50 dark:border-slate-800/50">
                  <div className="inline-flex items-center gap-3 text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    <span className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-md dark:shadow-none group-hover:shadow-lg dark:group-hover:bg-slate-700 transition-all duration-300 group-hover:scale-110">
                      <ChevronRight className="w-5 h-5 rtl:-scale-x-100 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
