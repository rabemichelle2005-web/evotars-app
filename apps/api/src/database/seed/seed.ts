import { PrismaClient } from '@repo/database';
import { TWITCH_PLATFORM_ID } from '../../constants';
import { actionSeed } from './actions';
import { repairAllUsersCommands } from './commands/repair';
import { dudesSkinCollectionSeed } from './skins';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await actionSeed(prisma);
  await dudesSkinCollectionSeed(prisma);

  await prisma.platform.upsert({
    where: { id: TWITCH_PLATFORM_ID },
    update: {},
    create: {
      name: 'twitch',
    },
  });

  // Repair existing users that are missing default commands (e.g. from
  // before !jump/!dash/!grow seeding existed, or before avatar
  // customization was locked down). Runs after actionSeed so the
  // jump/dash/grow/color/sprite actions it looks up already exist.
  await repairAllUsersCommands(prisma);
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
