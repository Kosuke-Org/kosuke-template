import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockTRPCContext } from '@/__tests__/setup/mocks';
import { expectTRPCError } from '@/__tests__/setup/utils';

import { ERRORS } from '@/lib/services/constants';
import * as taskService from '@/lib/services/task-service';
import { createCaller } from '@/lib/trpc/server';

vi.mock('@/lib/services/task-service', () => ({
  listTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));

describe('Tasks Router', () => {
  const userId = 'user_123';
  const otherUserId = 'user_456';
  const taskId = '11111111-1111-4111-8111-111111111111';
  const orgId = '22222222-2222-4222-8222-222222222222';

  const mockTask = {
    id: taskId,
    userId,
    organizationId: null,
    title: 'Write tests',
    description: 'Cover the routers',
    completed: false,
    priority: 'medium' as const,
    dueDate: null,
    isOverdue: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const authedCaller = () => createCaller(createMockTRPCContext({ userId }));
  const anonCaller = () => createCaller(createMockTRPCContext({ userId: null }));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('scopes the query to the caller from context, not to any client-supplied id', async () => {
      vi.mocked(taskService.listTasks).mockResolvedValue([mockTask]);

      const caller = await authedCaller();
      const result = await caller.tasks.list({ completed: false, priority: 'high' });

      expect(result).toEqual([mockTask]);
      expect(taskService.listTasks).toHaveBeenCalledWith({
        userId,
        organizationId: undefined,
        completed: false,
        priority: 'high',
        searchQuery: undefined,
      });
    });

    it('passes an explicit null organizationId through so personal tasks can be isolated', async () => {
      vi.mocked(taskService.listTasks).mockResolvedValue([]);

      const caller = await authedCaller();
      await caller.tasks.list({ organizationId: null });

      expect(taskService.listTasks).toHaveBeenCalledWith(
        expect.objectContaining({ userId, organizationId: null })
      );
    });

    it('rejects an unauthenticated caller', async () => {
      const caller = await anonCaller();

      await expectTRPCError(caller.tasks.list(), 'UNAUTHORIZED');
      expect(taskService.listTasks).not.toHaveBeenCalled();
    });

    it('rejects a non-uuid organizationId filter', async () => {
      const caller = await authedCaller();

      await expectTRPCError(caller.tasks.list({ organizationId: 'not-a-uuid' }), 'BAD_REQUEST');
      expect(taskService.listTasks).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('creates a task owned by the authenticated caller', async () => {
      vi.mocked(taskService.createTask).mockResolvedValue(mockTask);

      const caller = await authedCaller();
      const result = await caller.tasks.create({
        title: 'Write tests',
        description: 'Cover the routers',
        priority: 'medium',
      });

      expect(result).toEqual(mockTask);
      expect(taskService.createTask).toHaveBeenCalledWith({
        userId,
        organizationId: undefined,
        title: 'Write tests',
        description: 'Cover the routers',
        priority: 'medium',
        dueDate: undefined,
      });
    });

    it('ignores any attempt to set the owner from the input payload', async () => {
      vi.mocked(taskService.createTask).mockResolvedValue(mockTask);

      const caller = await authedCaller();
      await caller.tasks.create({
        title: 'Write tests',
        // @ts-expect-error - deliberately passing an unknown field a hostile client might send
        userId: otherUserId,
      });

      expect(taskService.createTask).toHaveBeenCalledWith(expect.objectContaining({ userId }));
    });

    it('rejects an empty title', async () => {
      const caller = await authedCaller();

      await expectTRPCError(caller.tasks.create({ title: '' }), 'BAD_REQUEST');
      expect(taskService.createTask).not.toHaveBeenCalled();
    });

    it('rejects an unauthenticated caller', async () => {
      const caller = await anonCaller();

      await expectTRPCError(caller.tasks.create({ title: 'Write tests' }), 'UNAUTHORIZED');
      expect(taskService.createTask).not.toHaveBeenCalled();
    });

    it('maps a service failure to its error code', async () => {
      vi.mocked(taskService.createTask).mockRejectedValue(
        new Error('Failed to create task', { cause: ERRORS.INTERNAL_SERVER_ERROR })
      );

      const caller = await authedCaller();

      await expectTRPCError(
        caller.tasks.create({ title: 'Write tests' }),
        'INTERNAL_SERVER_ERROR',
        'Failed to create task'
      );
    });
  });

  describe('update', () => {
    it('forwards only the fields present in the input', async () => {
      vi.mocked(taskService.updateTask).mockResolvedValue({ ...mockTask, title: 'Renamed' });

      const caller = await authedCaller();
      await caller.tasks.update({ id: taskId, title: 'Renamed' });

      expect(taskService.updateTask).toHaveBeenCalledWith({
        id: taskId,
        userId,
        title: 'Renamed',
      });
    });

    it('converts the completed boolean into the string column value', async () => {
      vi.mocked(taskService.updateTask).mockResolvedValue({ ...mockTask, completed: true });

      const caller = await authedCaller();
      await caller.tasks.update({ id: taskId, completed: true });

      expect(taskService.updateTask).toHaveBeenCalledWith({
        id: taskId,
        userId,
        completed: 'true',
      });
    });

    it('forwards a null organizationId to detach a task from its organization', async () => {
      vi.mocked(taskService.updateTask).mockResolvedValue(mockTask);

      const caller = await authedCaller();
      await caller.tasks.update({ id: taskId, organizationId: null });

      expect(taskService.updateTask).toHaveBeenCalledWith({
        id: taskId,
        userId,
        organizationId: null,
      });
    });

    it('forwards an arbitrary organizationId without checking membership (documents current behavior)', async () => {
      vi.mocked(taskService.updateTask).mockResolvedValue(mockTask);

      const caller = await authedCaller();
      await caller.tasks.update({ id: taskId, organizationId: orgId });

      // `tasks` uses protectedProcedure, so no membership check runs on organizationId.
      expect(taskService.updateTask).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: orgId })
      );
    });

    it('surfaces NOT_FOUND when the task is missing or owned by someone else', async () => {
      vi.mocked(taskService.updateTask).mockRejectedValue(
        new Error('Task not found or you do not have permission to update it', {
          cause: ERRORS.NOT_FOUND,
        })
      );

      const caller = await authedCaller();

      await expectTRPCError(
        caller.tasks.update({ id: taskId, title: 'Renamed' }),
        'NOT_FOUND',
        'do not have permission'
      );
    });

    it('rejects a non-uuid task id', async () => {
      const caller = await authedCaller();

      await expectTRPCError(caller.tasks.update({ id: 'nope', title: 'x' }), 'BAD_REQUEST');
      expect(taskService.updateTask).not.toHaveBeenCalled();
    });

    it('rejects an unauthenticated caller', async () => {
      const caller = await anonCaller();

      await expectTRPCError(caller.tasks.update({ id: taskId, title: 'x' }), 'UNAUTHORIZED');
      expect(taskService.updateTask).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes a task scoped to the authenticated caller', async () => {
      vi.mocked(taskService.deleteTask).mockResolvedValue({ success: true });

      const caller = await authedCaller();
      const result = await caller.tasks.delete({ id: taskId });

      expect(result).toEqual({ success: true });
      expect(taskService.deleteTask).toHaveBeenCalledWith({ id: taskId, userId });
    });

    it('surfaces NOT_FOUND when the task belongs to another user', async () => {
      vi.mocked(taskService.deleteTask).mockRejectedValue(
        new Error('Task not found or you do not have permission to delete it', {
          cause: ERRORS.NOT_FOUND,
        })
      );

      const caller = await authedCaller();

      await expectTRPCError(caller.tasks.delete({ id: taskId }), 'NOT_FOUND');
    });

    it('rejects an unauthenticated caller', async () => {
      const caller = await anonCaller();

      await expectTRPCError(caller.tasks.delete({ id: taskId }), 'UNAUTHORIZED');
      expect(taskService.deleteTask).not.toHaveBeenCalled();
    });
  });
});
