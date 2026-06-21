import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CreateItemDto, UpdateItemDto } from '@eling/shared';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ItemsService, Owner } from './items.service';

@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  private owner(req: Request): Owner {
    return { userId: req.userId, sessionId: req.sessionId };
  }

  @Post()
  create(@Body() dto: CreateItemDto, @Req() req: Request) {
    return this.itemsService.create(dto, this.owner(req));
  }

  @Get('search')
  search(@Query('q') q: string, @Req() req: Request) {
    return this.itemsService.search(q ?? '', this.owner(req));
  }

  @Get('export')
  @UseGuards(JwtAuthGuard)
  export(@Req() req: Request) {
    return this.itemsService.export(this.owner(req));
  }

  @Get()
  findAll(
    @Query('status') status: string | undefined,
    @Query('type') type: string | undefined,
    @Query('context') context: string | undefined,
    @Req() req: Request,
  ) {
    return this.itemsService.findAll({ status, type, context }, this.owner(req));
  }

  @Get(':id')
  findById(@Param('id') id: string, @Req() req: Request) {
    return this.itemsService.findById(id, this.owner(req));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateItemDto, @Req() req: Request) {
    return this.itemsService.update(id, dto, this.owner(req));
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.itemsService.remove(id, this.owner(req));
  }
}
