import { Action, PrismaClient, User } from '@repo/database';
import { CommandSeedResult } from './jump';

export async function defaultGrowCommandSeed(
  prisma: PrismaClient,
  user: User,
  action?: Action,
): Promise<CommandSeedResult> {
  const growAction =
    action ??
    (await prisma.action.findFirst({
      where: { name: 'grow' },
    }));

  // Create non existing command based on actions for each user

  if (!growAction) {
    return 'action_missing';
  }

  const foundGrowCommand = await prisma.command.findFirst({
    where: {
      user: {
        id: user.id,
      },
      action: {
        id: growAction.id,
      },
    },
  });

  if (foundGrowCommand) {
    return 'exists';
  }

  await prisma.command.create({
    data: {
      text: `!grow`,
      cooldown: 20,
      isActive: true,
      action: {
        connect: {
          id: growAction.id,
        },
      },
      user: {
        connect: {
          id: user.id,
        },
      },
      data: {
        action: {
          duration: 10,
          scale: 2,
        },
        arguments: [],
      },
    },
  });

  return 'created';
}
