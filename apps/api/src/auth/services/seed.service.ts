import { PrismaService } from '@/database/prisma.service';
import { defaultDashCommandSeed } from '@/database/seed/commands/dash';
import { defaultGrowCommandSeed } from '@/database/seed/commands/grow';
import { defaultJumpCommandSeed } from '@/database/seed/commands/jump';
import { AVATAR_CUSTOMIZATION_ACTION_NAMES } from '@/database/seed/commands/repair';
import { defaultUserSkinCollection } from '@/database/seed/skins/collection';
import { defaultUserSkins } from '@/database/seed/skins/skin';
import { Injectable } from '@nestjs/common';
import { User } from '@repo/database';

// Avatar customization is locked down for this installation: every viewer
// always renders as the forced white duck (see FORCED_AVATAR_* in
// constants.ts). !color and !skin must therefore never be (re)created as
// active commands here, and any pre-existing rows from before this was
// locked down must be disabled on next login.

@Injectable()
export class SeedService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async createDefaultCommands(user: User): Promise<void> {
    await Promise.all([
      defaultJumpCommandSeed(this.prismaService, user),
      defaultGrowCommandSeed(this.prismaService, user),
      defaultDashCommandSeed(this.prismaService, user),
    ]);
  }

  public async disableAvatarCustomizationCommands(user: User): Promise<void> {
    await this.prismaService.command.updateMany({
      where: {
        userId: user.id,
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

  public async createDefaultData(user: User): Promise<void> {
    await this.createDefaultCommands(user);
    await this.disableAvatarCustomizationCommands(user);
    await defaultUserSkinCollection(this.prismaService, user.id);
    await defaultUserSkins(this.prismaService, user.id);
  }
}
