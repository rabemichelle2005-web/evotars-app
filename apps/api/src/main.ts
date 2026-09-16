import { ConfigService } from '@/config/config.service';
import { PrismaService } from '@/database/prisma.service';
import { runSeed } from '@/database/seed/run';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaClient } from '@repo/database';
import { PrismaSessionStore } from '@quixo3/prisma-session-store';
import session from 'express-session';
import passport from 'passport';
import { TwitchHttpExceptionFilter } from './admin/filters/twitch-http-exception.filter';
import { AppModule } from './app/app.module';
import { ZodFilter } from './filters/zod.filter';

import './instruments';

const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days.
const SESSION_CHECK_PERIOD = 2 * 60 * 1000; // 2 minutes.

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const port = process.env.PORT || 3000;
  const configService = app.get(ConfigService);

  // TODO: configure cors.
  app.enableCors();
  app.use(
    session({
      store: new PrismaSessionStore(new PrismaClient(), {
        checkPeriod: SESSION_CHECK_PERIOD,
        dbRecordIdIsSessionId: true,
        dbRecordIdFunction: undefined,
      }),
      secret: configService.sessionSecret,
      saveUninitialized: false,
      resave: false,
      cookie: {
        maxAge: COOKIE_MAX_AGE,
        sameSite: 'lax',
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.setGlobalPrefix('/api');

  app.set('query parser', 'extended');

  app.useGlobalFilters(new ZodFilter());
  app.useGlobalFilters(new TwitchHttpExceptionFilter());

  // Safety net: actions/skins/commands are normally seeded by the
  // standalone `build-seed` script Railway runs as its Pre-Deploy
  // Command. That command lives in Railway's dashboard, outside this
  // repo, so this app has no way to confirm it actually ran. Re-running
  // the same idempotent seed here on every boot guarantees jump/dash/grow
  // commands (and the action/skin catalog) exist for every existing user
  // even if the Pre-Deploy Command is missing, misconfigured, or skipped.
  try {
    const prismaService = app.get(PrismaService);
    console.log('[boot-seed] starting');
    await runSeed(prismaService);
    console.log('[boot-seed] done');
  } catch (error) {
    console.error('[boot-seed] failed', error);
  }

  await app.listen(port);
}

void bootstrap();
