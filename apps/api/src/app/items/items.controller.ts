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
import { CreateItemDto, UpdateItemDto } from '@eling/shared';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ItemsService } from './items.service';

@Controller('items')
@UseGuards(JwtAuthGuard)
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  create(@Body() dto: CreateItemDto) {
    return this.itemsService.create(dto);
  }

  @Get('search')
  search(@Query('q') q: string) {
    return this.itemsService.search(q ?? '');
  }

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('context') context?: string,
  ) {
    return this.itemsService.findAll({ status, type, context });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.itemsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.itemsService.remove(id);
  }
}
