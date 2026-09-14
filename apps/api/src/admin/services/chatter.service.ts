import { Injectable } from '@nestjs/common';
import { ChatterRepository } from '../repositories/chatter.repository';
import {
  FORCED_AVATAR_COLOR,
  FORCED_AVATAR_SPRITE,
  TWITCH_PLATFORM_ID,
} from '@/constants';
import { Chatter } from '@repo/database';
import { UserInfo } from '@repo/types';

@Injectable()
export class ChatterService {
  constructor(private readonly chatterRepository: ChatterRepository) {}

  public async getChatter(userId: number, chatterId: string): Promise<Chatter> {
    let chatter = await this.chatterRepository.getChatterById(
      userId,
      chatterId,
    );

    if (!chatter) {
      const data = {
        user: {
          connect: {
            id: userId,
          },
        },
        platform: {
          connect: {
            id: TWITCH_PLATFORM_ID,
          },
        },
        chatterId,
      };

      chatter = await this.chatterRepository.create(data);
    }

    return chatter;
  }

  public async updateChatter(
    userId: number,
    chatterId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    info: UserInfo,
  ): Promise<Chatter> {
    const chatter = await this.getChatter(userId, chatterId);

    // Avatar skin/color are locked to a white duck; nothing may persist a
    // different value here, regardless of what the caller requested.
    return await this.chatterRepository.update(userId, chatter.id, {
      ...chatter,
      sprite: FORCED_AVATAR_SPRITE,
      color: FORCED_AVATAR_COLOR,
    });
  }
}
