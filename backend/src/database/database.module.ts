import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Global() // Makes DatabaseService available everywhere without importing the module
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
