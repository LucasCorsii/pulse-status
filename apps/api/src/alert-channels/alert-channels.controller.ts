import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AlertChannelsService } from './alert-channels.service';
import { CreateChannelDto, UpdateChannelDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('alert-channels')
export class AlertChannelsController {
  constructor(private readonly channels: AlertChannelsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.channels.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateChannelDto) {
    return this.channels.create(user.id, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateChannelDto) {
    return this.channels.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.channels.remove(user.id, id);
  }
}
