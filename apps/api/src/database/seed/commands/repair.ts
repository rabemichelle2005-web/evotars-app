import { PrismaClient } from '@repo/database';
import { defaultDashCommandSeed } from './dash';
import { defaultGrowCommandSeed } from './grow';
import { CommandSeedResult, defaultJumpCommandSeed } from './jump';

// Avatar customization is locked down for this installation: every viewer
// always renders as the forced white duck (see FORCED_AVATAR_* in
// constants.ts). !color and !skin must therefore never be active, no
// matter how their Command rows got created.
export const AVATAR_CUSTOMIZATION_ACTION_NAMES = ['color', 'sprite'];

type Tally = Record<CommandSeedResult, number>;

function emptyTally(): Tally {
  return { created: 0, exists: 0, action_missing: 0 };
}

function record(tally: Tally, result: CommandSeedResult): void {
  tally[result] += 1;
}

function summarize(name: string, tally: Tally): string {
  const summary = `${name}: created=${tally.created} exists=${tally.exists}`;

  if (tally.action_missing > 0) {
    // This means the jump/dash/grow Action row itself doesn't exist yet,
    // i.e. actionSeed() hasn't successfully run against this database -
    // no command can be created until it does.
    return `${summary} action_missing=${tally.action_missing} (WARNING: '${name}' Action row not found - run actionSeed first)`;
  }

  return summary;
}

// Deterministic, idempotent repair for every user already in the
// database: fills in any missing !jump/!dash/!grow command rows and
// disables any pre-existing !color/!skin rows. Safe to run on every
// deploy - each step is a find-or-create / updateMany, so re-running it
// against already-repaired users is a no-op.
export async function repairAllUsersCommands(
  prisma: PrismaClient,
): Promise<void> {
  const users = await prisma.user.findMany();

  console.log(`[seed:repair] existing users found: ${users.length}`);

  const jumpTally = emptyTally();
  const dashTally = emptyTally();
  const growTally = emptyTally();

  for (const user of users) {
    record(jumpTally, await defaultJumpCommandSeed(prisma, user));
    record(dashTally, await defaultDashCommandSeed(prisma, user));
    record(growTally, await defaultGrowCommandSeed(prisma, user));
  }

  console.log(`[seed:repair] ${summarize('jump', jumpTally)}`);
  console.log(`[seed:repair] ${summarize('dash', dashTally)}`);
  console.log(`[seed:repair] ${summarize('grow', growTally)}`);

  const { count: disabledCount } = await prisma.command.updateMany({
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

  console.log(
    `[seed:repair] color/skin commands disabled this run: ${disabledCount}`,
  );
}
