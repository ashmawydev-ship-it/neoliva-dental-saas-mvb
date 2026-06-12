'use server'

import { withPermission } from '@/lib/rbac/guard'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, startOfMonth } from 'date-fns'
import { unstable_cache } from 'next/cache'

function getCachedStats(tenantId: string) {
  return unstable_cache(
    async () => {
      const now = new Date()
      const startOfToday = startOfDay(now)
      const endOfToday = endOfDay(now)
      const monthStart = startOfMonth(now)

      const [
        todayAppointments,
        totalPatients,
        monthlyRevenue,
        pendingInvoices,
        recentPatients,
        upcomingAppointments,
      ] = await Promise.all([
        // Today's appointments count
        prisma.appointment.count({
          where: { tenantId, date: { gte: startOfToday, lte: endOfToday } }
        }),
        // Total active patients
        prisma.patient.count({
          where: { tenantId }
        }),
        // Revenue this month (sum of payments)
        prisma.payment.aggregate({
          where: { tenantId, paidAt: { gte: monthStart } },
          _sum: { amount: true }
        }),
        // Pending invoices count
        prisma.invoice.count({
          where: { tenantId, status: 'PENDING' }
        }),
        // Recent 5 patients
        prisma.patient.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, name: true, phone: true, createdAt: true }
        }),
        // Upcoming appointments today
        prisma.appointment.findMany({
          where: { 
            tenantId, 
            date: { gte: startOfToday, lte: endOfToday },
            status: { not: 'CANCELLED' }
          },
          orderBy: { time: 'asc' },
          take: 5,
          include: { 
            patient: { select: { name: true } },
            doctor: { select: { name: true } }
          }
        }),
      ])

      return {
        todayAppointments,
        totalPatients,
        monthlyRevenue: monthlyRevenue._sum.amount?.toNumber() ?? 0,
        pendingInvoices,
        recentPatients,
        upcomingAppointments,
      }
    },
    ['dashboard-stats', tenantId],
    { revalidate: 300, tags: ['dashboard-stats'] }
  )();
}

export async function getDashboardStats() {
  return withPermission('reports', 'read', async (session) => {
    const tenantId = session.tenantId!
    return getCachedStats(tenantId)
  })
}
