import { PrismaClient } from '@repo/database';
import { defaultDashCommandSeed } from './dash';
import { defaultGrowCommandSeed } from './grow';
import { defaultJumpCommandSeed } from './jump';

// Avatar customization is locked down for this installation: every viewer
// always renders as the forced white duck (see FORCED_AVATAR_* in
// constants.ts). !color and !skin must therefore never be active, no
// matter how their Command rows got created.
export const AVATAR_CUSTOMIZATION_ACTION_NAMES = ['color', 'sprite'];

// Deterministic, idempotent repair for every user already in the
// database: fills in any missing !jump/!dash/!grow command rows and
// disables any pre-existing !color/!skin rows. Safe to run on every
// deploy - each step is a find-or-create / updateMany, so re-running it
// against already-repaired users is a no-op.
export async function repairAllUsersCommands(
  prisma: PrismaClient,
): Promise<void> {
  const users = await prisma.user.findMany();

  for (const user of users) {
    await defaultJumpCommandSeed(prisma, user);
    await defaultDashCommandSeed(prisma, user);
    await defaultGrowCommandSeed(prisma, user);
  }

  await prisma.command.updateMany({
    where: {
      isActive: true,
      action: {
        name: { in: AVATAR_CUSTOMIZATION_ACTION_NAMES },
      },
    },
    data: {
      isActive: false,
    },
  });
}
