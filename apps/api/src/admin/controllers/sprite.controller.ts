import { ZodPipe } from '@/pipes/zod.pipe';
import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { JsonObject } from '@repo/database/generated/client/runtime/library';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { z } from 'zod';
import { UserRepository } from '../repositories';
import {
  FORCED_AVATAR_SPRITE,
  FORCED_AVATAR_SPRITE_COLLECTION,
} from '@/constants';

type SpriteDto = {
  guid: string;
  sprite: string;
};

export const spriteDtoSchema = z
  .object({
    guid: z.string().min(1).max(255),
    sprite: z.string().min(1).max(255),
  })
  .strict();

export type SpriteEntity = {
  data: JsonObject;
  image: string;
  sprite: JsonObject;
};

@Controller('/sprite')
export class SpriteController {
  constructor(private readonly userRepository: UserRepository) {}

  @Post()
  public async getSprite(
    @Body(new ZodPipe(spriteDtoSchema)) body: SpriteDto,
  ): Promise<JsonObject> {
    const user = await this.userRepository.getUserByGuid(body.guid);

    if (!user) {
      throw new BadRequestException();
    }

    // Every viewer avatar is locked to the white duck sprite. This endpoint
    // has a single caller (the overlay's sprite loader), so it always
    // resolves the bundled duck asset regardless of the requested sprite
    // name, per-streamer skin configuration, or any command/reward.
    return this.prepareSprite(
      FORCED_AVATAR_SPRITE_COLLECTION,
      FORCED_AVATAR_SPRITE,
    );
  }

  private prepareSprite(collectionName: string, skinName: string): JsonObject {
    const src = `static/skins/${collectionName}/`;
    const spriteName = skinName;

    const spritePath = path.resolve(process.cwd(), '../../', src + spriteName);

    const spriteSrc = spritePath + '/sprite.json';
    const dataSrc = spritePath + '/data.json';

    if (!existsSync(spriteSrc) || !existsSync(dataSrc)) {
      throw new NotFoundException();
    }

    const imagePath = `/static/skins/${collectionName}/` + spriteName;

    const sprite = JSON.parse(readFileSync(spriteSrc).toString());
    const data = JSON.parse(readFileSync(dataSrc).toString());

    return {
      data: data,
      image: imagePath + '/sprite.png',
      sprite: sprite,
    };
  }
}
