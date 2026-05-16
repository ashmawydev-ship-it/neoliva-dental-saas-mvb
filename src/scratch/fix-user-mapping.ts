
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
  const email = 'sarah@smilecare.com' // Assuming this is the user
  
  console.log('--- Repairing User Mapping ---')
  
  // 1. Find the staff member
  const staff = await prisma.staff.findUnique({
    where: { email }
  })
  
  if (!staff) {
    console.error('Staff member not found:', email)
    return
  }
  
  console.log('Found staff:', staff.name, 'in tenant:', staff.tenantId)
  
  // 2. Create User record
  const user = await prisma.user.upsert({
    where: { supabaseId },
    update: {
      email: email
    },
    create: {
      supabaseId,
      email,
    }
  })
  
  console.log('User record created/updated:', user.id)

  // 3. Create/Update TenantMembership
  const membership = await prisma.tenantMembership.upsert({
    where: {
      userId_tenantId: {
        userId: user.id,
        tenantId: staff.tenantId
      }
    },
    update: {
      status: 'ACTIVE',
      isActive: true
    },
    create: {
      userId: user.id,
      tenantId: staff.tenantId,
      role: staff.role,
      status: 'ACTIVE',
      isActive: true
    }
  })

  console.log('TenantMembership created/updated:', membership.id)
  
  // 4. Link Staff to Membership
  await prisma.staff.update({
    where: { id: staff.id },
    data: {
      membershipId: membership.id
    }
  })
  
  console.log('Staff linked to TenantMembership successfully!')
  console.log('You should now be able to access the dashboard.')
}

main()
  .catch(e => {
    console.error('Repair failed:', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
