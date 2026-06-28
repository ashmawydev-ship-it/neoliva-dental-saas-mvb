'use client'

import { useTranslations } from 'next-intl'
import { motion, useInView, Variants } from 'framer-motion'
import { useEffect, useState, useRef } from 'react'

function Counter({ from, to, duration = 2, suffix = "" }: { from: number, to: number, duration?: number, suffix?: string }) {
  const [count, setCount] = useState(from)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  useEffect(() => {
    if (isInView) {
      let startTime: number
      let animationFrame: number

      const updateCounter = (timestamp: number) => {
        if (!startTime) startTime = timestamp
        const progress = Math.min((timestamp - startTime) / (duration * 1000), 1)
        
        // Easing function (easeOutQuart)
        const easeProgress = 1 - Math.pow(1 - progress, 4)
        const currentCount = Math.floor(easeProgress * (to - from) + from)
        
        setCount(currentCount)

        if (progress < 1) {
          animationFrame = requestAnimationFrame(updateCounter)
        } else {
          setCount(to)
        }
      }

      animationFrame = requestAnimationFrame(updateCounter)
      return () => cancelAnimationFrame(animationFrame)
    }
  }, [isInView, from, to, duration])

  return (
    <span ref={ref} className="tabular-nums">
      {count}{suffix}
    </span>
  )
}

export function Stats() {
  const t = useTranslations('landing.stats')

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
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] } }
  }

  return (
    <section className="py-12 bg-transparent relative z-20 -mt-24 lg:-mt-32 pointer-events-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-8 lg:p-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-white/10 dark:border-white/10 relative overflow-hidden pointer-events-auto"
        >
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-blue-500/20 via-indigo-500/10 to-transparent rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-violet-500/20 via-blue-500/10 to-transparent rounded-full blur-[80px] translate-y-1/3 -translate-x-1/3"></div>
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.04] mix-blend-overlay"></div>
          
          {/* Inner border glow */}
          <div className="absolute inset-0 rounded-3xl border border-white/5 mix-blend-overlay pointer-events-none"></div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12 lg:gap-12 divide-x-0 lg:divide-x lg:divide-white/10 rtl:lg:divide-x-reverse"
          >
            {/* Stat 1 */}
            <motion.div variants={itemVariants} className="text-center group flex flex-col items-center">
              <div className="text-5xl lg:text-6xl font-black mb-3 tracking-tight flex justify-center text-transparent bg-clip-text bg-gradient-to-br from-white to-white/70 group-hover:scale-110 transition-transform duration-500 group-hover:from-blue-400 group-hover:to-indigo-400 drop-shadow-sm">
                <Counter from={0} to={500} suffix="+" />
              </div>
              <div className="text-slate-400 group-hover:text-slate-300 font-bold text-sm lg:text-base uppercase tracking-widest transition-colors">
                {t('clinics')}
              </div>
            </motion.div>

            {/* Stat 2 */}
            <motion.div variants={itemVariants} className="text-center group flex flex-col items-center">
              <div className="text-5xl lg:text-6xl font-black mb-3 tracking-tight flex justify-center text-transparent bg-clip-text bg-gradient-to-br from-white to-white/70 group-hover:scale-110 transition-transform duration-500 group-hover:from-blue-400 group-hover:to-indigo-400 drop-shadow-sm">
                1.2M+
              </div>
              <div className="text-slate-400 group-hover:text-slate-300 font-bold text-sm lg:text-base uppercase tracking-widest transition-colors">
                {t('patients')}
              </div>
            </motion.div>

            {/* Stat 3 */}
            <motion.div variants={itemVariants} className="text-center group flex flex-col items-center">
              <div className="text-5xl lg:text-6xl font-black mb-3 tracking-tight flex justify-center text-transparent bg-clip-text bg-gradient-to-br from-white to-white/70 group-hover:scale-110 transition-transform duration-500 group-hover:from-blue-400 group-hover:to-indigo-400 drop-shadow-sm">
                <Counter from={0} to={25} suffix="k+" />
              </div>
              <div className="text-slate-400 group-hover:text-slate-300 font-bold text-sm lg:text-base uppercase tracking-widest transition-colors">
                {t('appointments')}
              </div>
            </motion.div>

            {/* Stat 4 */}
            <motion.div variants={itemVariants} className="text-center group flex flex-col items-center">
              <div className="text-5xl lg:text-6xl font-black mb-3 tracking-tight flex justify-center text-transparent bg-clip-text bg-gradient-to-br from-white to-white/70 group-hover:scale-110 transition-transform duration-500 group-hover:from-blue-400 group-hover:to-indigo-400 drop-shadow-sm">
                <Counter from={0} to={99} suffix="%" />
              </div>
              <div className="text-slate-400 group-hover:text-slate-300 font-bold text-sm lg:text-base uppercase tracking-widest transition-colors">
                {t('satisfaction')}
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
