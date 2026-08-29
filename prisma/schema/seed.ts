import { PrismaClient } from '@prisma/client';
import { seedSuperAdmin } from './seeds/super-admin.seed';
import { seedFreeSubscriptionPlan } from './seeds/free-subscriptionPlan';

const prisma = new PrismaClient();

export async function main() {
  await seedSuperAdmin(prisma);
  await seedFreeSubscriptionPlan(prisma);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error('Prisma seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
