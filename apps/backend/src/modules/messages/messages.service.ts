import { Injectable, NotFoundException, OnApplicationBootstrap, ForbiddenException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class MessagesService implements OnApplicationBootstrap {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    // Auto-migrate database schema to support denied_count column
    try {
      await this.dataSource.query(
        `ALTER TABLE message_request ADD COLUMN IF NOT EXISTS denied_count INTEGER DEFAULT 0`
      );
    } catch (e) {
      console.error('Failed to run schema migration for denied_count:', e);
    }
  }

  async createRequest(employeeId: number): Promise<any> {
    // Check if there is any thread for this employee
    const active = await this.dataSource.query(
      `SELECT * FROM message_request WHERE employee_id = $1 LIMIT 1`,
      [employeeId]
    );

    if (active && active.length > 0) {
      const thread = active[0];
      if (thread.denied_count >= 2) {
        throw new ForbiddenException('Request limit exceeded.');
      }

      const currentMessages = JSON.parse(thread.messages || '[]');
      if (thread.status === 'CLOSED' || thread.status === 'DENIED' || thread.status === 'ARCHIVED') {
        currentMessages.push({
          sender: 'employee',
          text: 'Employee requested to reopen the chat.',
          timestamp: new Date().toISOString(),
          isSystem: true,
          read: false
        });
      }
      
      const updateRes = await this.dataSource.query(
        `UPDATE message_request 
         SET status = 'PENDING', messages = $1, has_admin_unread = true, has_employee_unread = false, updated_at = NOW() 
         WHERE id = $2 RETURNING *`,
        [JSON.stringify(currentMessages), thread.id]
      );
      return updateRes[0];
    }

    // Otherwise create a new request
    const insertRes = await this.dataSource.query(
      `INSERT INTO message_request (employee_id, status, messages, has_admin_unread, has_employee_unread, denied_count) 
       VALUES ($1, 'PENDING', '[]', true, false, 0) RETURNING *`,
      [employeeId]
    );

    return insertRes[0];
  }

  async getEmployeeActiveThread(employeeId: number): Promise<any> {
    const res = await this.dataSource.query(
      `SELECT * FROM message_request WHERE employee_id = $1 ORDER BY updated_at DESC LIMIT 1`,
      [employeeId]
    );
    if (res && res.length > 0) {
      return res[0];
    }
    return null;
  }

  async employeeSendMessage(threadId: number, text: string): Promise<any> {
    const threadRes = await this.dataSource.query(
      `SELECT messages, status FROM message_request WHERE id = $1`,
      [threadId]
    );

    if (!threadRes || threadRes.length === 0) {
      throw new NotFoundException('Message thread not found.');
    }

    const currentMessages = JSON.parse(threadRes[0].messages || '[]');
    currentMessages.push({
      sender: 'employee',
      text,
      timestamp: new Date().toISOString(),
      read: false
    });

    const updateRes = await this.dataSource.query(
      `UPDATE message_request 
       SET messages = $1, has_admin_unread = true, has_employee_unread = false, updated_at = NOW() 
       WHERE id = $2 RETURNING *`,
      [JSON.stringify(currentMessages), threadId]
    );

    return updateRes[0];
  }

  async getAdminThreads(): Promise<any[]> {
    return this.dataSource.query(
      `SELECT mr.*, 
              e.english_first_name, e.english_last_name, e.arabic_first_name, e.arabic_last_name, e.email, e.employment_type, e.employee_picture_url,
              d.department_name 
       FROM message_request mr 
       JOIN employee e ON mr.employee_id = e.employee_id 
       LEFT JOIN department d ON e.department_id = d.department_id 
       ORDER BY mr.updated_at DESC`
    );
  }

  async adminRespondRequest(threadId: number, action: 'ACCEPT' | 'DENY'): Promise<any> {
    const threadRes = await this.dataSource.query(
      `SELECT messages FROM message_request WHERE id = $1`,
      [threadId]
    );

    if (!threadRes || threadRes.length === 0) {
      throw new NotFoundException('Message thread not found.');
    }

    const currentMessages = JSON.parse(threadRes[0].messages || '[]');
    
    if (action === 'ACCEPT') {
      currentMessages.push({
        sender: 'admin',
        text: 'Hello! I have accepted your message request. How can I help you?',
        timestamp: new Date().toISOString(),
        isSystem: true,
        read: true
      });

      await this.dataSource.query(
        `UPDATE message_request 
         SET status = 'ACCEPTED', denied_count = 0, messages = $1, has_admin_unread = false, has_employee_unread = true, updated_at = NOW() 
         WHERE id = $2`,
        [JSON.stringify(currentMessages), threadId]
      );
    } else {
      currentMessages.push({
        sender: 'admin',
        text: 'Your request to message the admin has been denied.',
        timestamp: new Date().toISOString(),
        isSystem: true,
        read: true
      });

      await this.dataSource.query(
        `UPDATE message_request 
         SET status = 'DENIED', denied_count = denied_count + 1, messages = $1, has_admin_unread = false, has_employee_unread = true, updated_at = NOW() 
         WHERE id = $2`,
        [JSON.stringify(currentMessages), threadId]
      );
    }

    return this.getAdminThreadById(threadId);
  }

  async adminSendMessage(threadId: number, text: string): Promise<any> {
    const threadRes = await this.dataSource.query(
      `SELECT messages FROM message_request WHERE id = $1`,
      [threadId]
    );

    if (!threadRes || threadRes.length === 0) {
      throw new NotFoundException('Message thread not found.');
    }

    const currentMessages = JSON.parse(threadRes[0].messages || '[]');
    currentMessages.push({
      sender: 'admin',
      text,
      timestamp: new Date().toISOString(),
      read: false
    });

    await this.dataSource.query(
      `UPDATE message_request 
       SET messages = $1, has_admin_unread = false, has_employee_unread = true, updated_at = NOW() 
       WHERE id = $2`,
      [JSON.stringify(currentMessages), threadId]
    );

    return this.getAdminThreadById(threadId);
  }

  async adminCloseThread(threadId: number): Promise<any> {
    const threadRes = await this.dataSource.query(
      `SELECT messages FROM message_request WHERE id = $1`,
      [threadId]
    );

    if (!threadRes || threadRes.length === 0) {
      throw new NotFoundException('Message thread not found.');
    }

    const currentMessages = JSON.parse(threadRes[0].messages || '[]');
    currentMessages.push({
      sender: 'admin',
      text: 'This chat thread has been closed by the admin.',
      timestamp: new Date().toISOString(),
      isSystem: true,
      read: true
    });

    await this.dataSource.query(
      `UPDATE message_request 
       SET status = 'CLOSED', messages = $1, has_admin_unread = false, has_employee_unread = true, updated_at = NOW() 
       WHERE id = $2`,
      [JSON.stringify(currentMessages), threadId]
    );

    return this.getAdminThreadById(threadId);
  }

  async adminGetUnreadCount(): Promise<number> {
    const res = await this.dataSource.query(
      `SELECT COUNT(*)::integer as count FROM message_request WHERE has_admin_unread = true`
    );
    return res[0]?.count || 0;
  }

  async employeeMarkRead(threadId: number): Promise<void> {
    const threadRes = await this.dataSource.query(
      `SELECT messages FROM message_request WHERE id = $1`,
      [threadId]
    );
    if (threadRes && threadRes.length > 0) {
      const messages = JSON.parse(threadRes[0].messages || '[]');
      const updatedMessages = messages.map((msg: any) => {
        if (msg.sender === 'admin' && !msg.read) {
          msg.read = true;
        }
        return msg;
      });
      
      await this.dataSource.query(
        `UPDATE message_request 
         SET has_employee_unread = false, messages = $1 
         WHERE id = $2`,
        [JSON.stringify(updatedMessages), threadId]
      );
    }
  }

  async adminMarkRead(threadId: number): Promise<void> {
    const threadRes = await this.dataSource.query(
      `SELECT messages FROM message_request WHERE id = $1`,
      [threadId]
    );
    if (threadRes && threadRes.length > 0) {
      const messages = JSON.parse(threadRes[0].messages || '[]');
      const updatedMessages = messages.map((msg: any) => {
        if (msg.sender === 'employee' && !msg.read) {
          msg.read = true;
        }
        return msg;
      });

      await this.dataSource.query(
        `UPDATE message_request 
         SET has_admin_unread = false, messages = $1 
         WHERE id = $2`,
        [JSON.stringify(updatedMessages), threadId]
      );
    }
  }

  async adminStartChat(employeeId: number): Promise<any> {
    const active = await this.dataSource.query(
      `SELECT * FROM message_request WHERE employee_id = $1 LIMIT 1`,
      [employeeId]
    );

    let threadId: number;

    if (active && active.length > 0) {
      const thread = active[0];
      threadId = thread.id;
      const currentMessages = JSON.parse(thread.messages || '[]');
      if (thread.status === 'CLOSED' || thread.status === 'DENIED' || thread.status === 'ARCHIVED') {
        currentMessages.push({
          sender: 'admin',
          text: 'Admin has reopened the chat session.',
          timestamp: new Date().toISOString(),
          isSystem: true,
          read: true
        });
      }
      
      await this.dataSource.query(
        `UPDATE message_request 
         SET status = 'ACCEPTED', denied_count = 0, messages = $1, has_admin_unread = false, has_employee_unread = true, updated_at = NOW() 
         WHERE id = $2`,
        [JSON.stringify(currentMessages), threadId]
      );
    } else {
      const systemMsg = JSON.stringify([{
        sender: 'admin',
        text: 'Admin started the chat session.',
        timestamp: new Date().toISOString(),
        isSystem: true,
        read: true
      }]);
      const insertRes = await this.dataSource.query(
        `INSERT INTO message_request (employee_id, status, messages, has_admin_unread, has_employee_unread, denied_count) 
         VALUES ($1, 'ACCEPTED', $2, false, true, 0) RETURNING id`,
        [employeeId, systemMsg]
      );
      threadId = insertRes[0].id;
    }

    return this.getAdminThreadById(threadId);
  }

  async getAdminThreadById(threadId: number): Promise<any> {
    const res = await this.dataSource.query(
      `SELECT mr.*, 
              e.english_first_name, e.english_last_name, e.arabic_first_name, e.arabic_last_name, e.email, e.employment_type, e.employee_picture_url,
              d.department_name 
       FROM message_request mr 
       JOIN employee e ON mr.employee_id = e.employee_id 
       LEFT JOIN department d ON e.department_id = d.department_id 
       WHERE mr.id = $1`,
      [threadId]
    );
    return res[0] || null;
  }

  async adminArchiveThread(threadId: number): Promise<any> {
    const threadRes = await this.dataSource.query(
      `SELECT messages FROM message_request WHERE id = $1`,
      [threadId]
    );

    if (!threadRes || threadRes.length === 0) {
      throw new NotFoundException('Message thread not found.');
    }

    const currentMessages = JSON.parse(threadRes[0].messages || '[]');
    currentMessages.push({
      sender: 'admin',
      text: 'This chat thread has been archived by the admin.',
      timestamp: new Date().toISOString(),
      isSystem: true,
      read: true
    });

    await this.dataSource.query(
      `UPDATE message_request 
       SET status = 'ARCHIVED', messages = $1, has_admin_unread = false, has_employee_unread = false, updated_at = NOW() 
       WHERE id = $2`,
      [JSON.stringify(currentMessages), threadId]
    );

    return this.getAdminThreadById(threadId);
  }
}
