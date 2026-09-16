import { Action, PrismaClient, User } from '@repo/database';

export async function defaultColorCommandSeed(
  prisma: PrismaClient,
  user: User,
  action?: Action,
): Promise<void> {
  const colorAction =
    action ??
    (await prisma.action.findFirst({
      where: { name: 'color' },
    }));

  if (!colorAction) {
    return;
  }

  const foundColorCommand = await prisma.command.findFirst({
    where: {
      user: {
        id: user.id,
      },
      action: {
        id: colorAction.id,
      },
    },
  });

  if (!foundColorCommand) {
    await prisma.command.create({
      data: {
        text: `!color`,
        cooldown: 0,
        // Avatar customization is locked down for this installation - every
        // viewer is forced to the white duck regardless of command state
        // (see FORCED_AVATAR_* in constants.ts), so this must never be
        // created active.
        isActive: false,
        action: {
          connect: {
            id: colorAction.id,
          },
        },
        user: {
          connect: {
            id: user.id,
          },
        },
        data: {
          arguments: ['color'],
          action: {},
        },
      },
    });
  }
}
