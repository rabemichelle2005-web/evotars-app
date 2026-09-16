import { PrismaClient } from '@repo/database';
import { TWITCH_PLATFORM_ID } from '../../constants';
import { actionSeed } from './actions';
import { repairAllUsersCommands } from './commands/repair';
import { dudesSkinCollectionSeed } from './skins';

// Core seed + repair steps shared by the standalone Railway pre-deploy
// seed script (seed.ts) and the app boot-time safety net (main.ts).
// Idempotent - every step is an upsert / find-or-create, so running it
// repeatedly (every deploy, every boot) never duplicates data.
export async function runSeed(prisma: PrismaClient): Promise<void> {
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
