import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateMonitorDto, UpdateMonitorDto } from './dto';
import { MonitorsService } from './monitors.service';

@UseGuards(JwtAuthGuard)
@Controller('monitors')
export class MonitorsController {
  constructor(private readonly monitors: MonitorsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.monitors.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateMonitorDto) {
    return this.monitors.create(user.id, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.monitors.get(user.id, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateMonitorDto) {
    return this.monitors.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.monitors.remove(user.id, id);
  }

  @Get(':id/checks')
  checks(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.monitors.checks(user.id, id, limit ? Number(limit) : 50);
  }

  @Get(':id/incidents')
  incidents(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.monitors.incidents(user.id, id);
  }
}
