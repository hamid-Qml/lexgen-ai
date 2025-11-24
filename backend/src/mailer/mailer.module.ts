// src/mailer/mailer.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import mailConfig from 'src/config/mail.config';
import { MailerService } from './mailer.service';

@Module({
  imports: [
    ConfigModule.forFeature(mailConfig), // provides CONFIGURATION(mail)
  ],
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}
