
import { PrismaClient } from '../generated/client'
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import * as dotenv from 'dotenv'

dotenv.config()

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const supabaseId = 'd378508b-58b1-44fa-88ef-d2aa3b3e6dde'
  console.log('--- Investigating User Record ---')
  console.log('Searching for Supabase ID:', supabaseId)

  const userCount = await prisma.user.count()
  console.log('Total User records:', userCount)

  const user = await prisma.user.findUnique({
    where: { supabaseId }
  })

  if (user) {
    console.log('User found in database:', user)
  } else {
    console.log('User NOT found in User table.')
    
    // Check if there is a staff member with a similar email?
    // We don't have the email from the error, so let's list all staff members
    const staff = await prisma.staff.findMany({
      include: { user: true }
    })
    
    console.log('Current Staff Members:')
    staff.forEach((s: any) => {
      console.log(`- ${s.name} (${s.email}): userId=${s.userId}, inviteAccepted=${s.inviteAccepted}, tenantId=${s.tenantId}`)
    })
  }
}

main()
  .catch(e => {
    console.error('Investigation failed:', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
