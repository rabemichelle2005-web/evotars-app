import { Action, PrismaClient, User } from '@repo/database';

export type CommandSeedResult = 'created' | 'exists' | 'action_missing';

export async function defaultJumpCommandSeed(
  prisma: PrismaClient,
  user: User,
  action?: Action,
): Promise<CommandSeedResult> {
  const jumpAction =
    action ??
    (await prisma.action.findFirst({
      where: { name: 'jump' },
    }));

  if (!jumpAction) {
    return 'action_missing';
  }

  // Create non existing command based on actions for each user

  const foundJumpCommand = await prisma.command.findFirst({
    where: {
      user: {
        id: user.id,
      },
      action: {
        id: jumpAction.id,
      },
    },
  });

  if (foundJumpCommand) {
    return 'exists';
  }

  await prisma.command.create({
    data: {
      text: `!jump`,
      cooldown: 0,
      isActive: true,
      action: {
        connect: {
          id: jumpAction.id,
        },
      },
      user: {
        connect: {
          id: user.id,
        },
      },
      data: {
        action: {
          velocityX: 3.5,
          velocityY: -8,
        },
        arguments: [],
      },
    },
  });

  return 'created';
}
