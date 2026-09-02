import 'dotenv/config';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SecurityModule } from '../security/security.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { getJwtExpirationSeconds, getJwtSecret } from './jwt.config';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    SecurityModule,
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: {
        expiresIn: getJwtExpirationSeconds(),
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
