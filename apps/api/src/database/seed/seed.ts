import { PrismaClient } from '@repo/database';
import { runSeed } from './run';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('[seed] starting (Railway pre-deploy seed script)');
  await runSeed(prisma);
  console.log('[seed] done');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
