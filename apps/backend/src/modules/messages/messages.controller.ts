import { Controller, Get, Post, Body, Param, UseGuards, Req, HttpCode, HttpStatus, ForbiddenException } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { SkipThrottle } from '@nestjs/throttler';

@UseGuards(JwtAuthGuard)
@SkipThrottle()
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  // ================= Employee Endpoints =================

  @Post('request')
  @HttpCode(HttpStatus.OK)
  async createRequest(@Req() req: any) {
    const employeeId = parseInt(req.user.userId, 10);
    return this.messagesService.createRequest(employeeId);
  }

  @Get('active')
  async getActiveThread(@Req() req: any) {
    const employeeId = parseInt(req.user.userId, 10);
    return this.messagesService.getEmployeeActiveThread(employeeId);
  }

  @Post('employee/send')
  @HttpCode(HttpStatus.OK)
  async employeeSendMessage(
    @Req() req: any,
    @Body() body: { threadId: number; text: string }
  ) {
    const employeeId = parseInt(req.user.userId, 10);
    // Double check that the thread belongs to this employee
    const active = await this.messagesService.getEmployeeActiveThread(employeeId);
    if (!active || active.id !== body.threadId) {
      throw new ForbiddenException('You can only message in your active thread.');
    }
    return this.messagesService.employeeSendMessage(body.threadId, body.text);
  }

  @Post('employee/mark-read/:id')
  @HttpCode(HttpStatus.OK)
  async employeeMarkRead(@Param('id') id: string) {
    await this.messagesService.employeeMarkRead(parseInt(id, 10));
    return { success: true };
  }

  // ================= Admin Endpoints =================

  @Post('admin/start-chat')
  @HttpCode(HttpStatus.OK)
  async adminStartChat(
    @Req() req: any,
    @Body() body: { employeeId: number }
  ) {
    const isAdmin = req.user.isAdmin === true;
    if (!isAdmin) {
      throw new ForbiddenException('Admin access only.');
    }
    return this.messagesService.adminStartChat(body.employeeId);
  }

  @Get('admin/threads')
  async getAdminThreads(@Req() req: any) {
    // Basic role protection (must be administrator)
    const isAdmin = req.user.isAdmin === true;
    if (!isAdmin) {
      throw new ForbiddenException('Admin access only.');
    }
    return this.messagesService.getAdminThreads();
  }

  @Get('admin/unread-count')
  async adminGetUnreadCount(@Req() req: any) {
    const isAdmin = req.user.isAdmin === true;
    if (!isAdmin) {
      throw new ForbiddenException('Admin access only.');
    }
    const count = await this.messagesService.adminGetUnreadCount();
    return { count };
  }

  @Post('admin/:id/respond')
  @HttpCode(HttpStatus.OK)
  async adminRespondRequest(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { action: 'ACCEPT' | 'DENY' }
  ) {
    const isAdmin = req.user.isAdmin === true;
    if (!isAdmin) {
      throw new ForbiddenException('Admin access only.');
    }
    return this.messagesService.adminRespondRequest(parseInt(id, 10), body.action);
  }

  @Post('admin/:id/send')
  @HttpCode(HttpStatus.OK)
  async adminSendMessage(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { text: string }
  ) {
    const isAdmin = req.user.isAdmin === true;
    if (!isAdmin) {
      throw new ForbiddenException('Admin access only.');
    }
    return this.messagesService.adminSendMessage(parseInt(id, 10), body.text);
  }

  @Post('admin/:id/close')
  @HttpCode(HttpStatus.OK)
  async adminCloseThread(@Req() req: any, @Param('id') id: string) {
    const isAdmin = req.user.isAdmin === true;
    if (!isAdmin) {
      throw new ForbiddenException('Admin access only.');
    }
    return this.messagesService.adminCloseThread(parseInt(id, 10));
  }

  @Post('admin/:id/archive')
  @HttpCode(HttpStatus.OK)
  async adminArchiveThread(@Req() req: any, @Param('id') id: string) {
    const isAdmin = req.user.isAdmin === true;
    if (!isAdmin) {
      throw new ForbiddenException('Admin access only.');
    }
    return this.messagesService.adminArchiveThread(parseInt(id, 10));
  }

  @Post('admin/:id/mark-read')
  @HttpCode(HttpStatus.OK)
  async adminMarkRead(@Req() req: any, @Param('id') id: string) {
    const isAdmin = req.user.isAdmin === true;
    if (!isAdmin) {
      throw new ForbiddenException('Admin access only.');
    }
    await this.messagesService.adminMarkRead(parseInt(id, 10));
    return { success: true };
  }
}
