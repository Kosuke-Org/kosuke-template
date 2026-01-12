/**
 * Tests for task service
 * Uses mocks to avoid creating real database records
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db/drizzle';
import type { Task } from '@/lib/db/schema';
import { ERRORS } from '@/lib/services/constants';
import * as taskService from '@/lib/services/task-service';

// Mock the database
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('TaskService', () => {
  const mockUserId = 'user-123';
  const mockOrgId = 'org-456';
  const mockTaskId = 'task-789';

  const mockTask: Task = {
    id: mockTaskId,
    userId: mockUserId,
    organizationId: mockOrgId,
    title: 'Test Task',
    description: 'Test Description',
    completed: 'false',
    priority: 'medium',
    dueDate: new Date('2026-12-31'),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('listTasks', () => {
    it('should return all tasks for a user', async () => {
      const mockDbTask = { ...mockTask, completed: 'false' };
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([mockDbTask]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await taskService.listTasks({
        userId: mockUserId,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: mockTaskId,
        title: 'Test Task',
        completed: false,
        isOverdue: false,
      });
      expect(db.select).toHaveBeenCalled();
    });

    it('should filter by organization', async () => {
      const mockDbTask = { ...mockTask, completed: 'false' };
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([mockDbTask]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await taskService.listTasks({
        userId: mockUserId,
        organizationId: mockOrgId,
      });

      expect(result).toHaveLength(1);
      expect(db.select).toHaveBeenCalled();
    });

    it('should filter by completion status', async () => {
      const mockDbTask = { ...mockTask, completed: 'true' };
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([mockDbTask]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await taskService.listTasks({
        userId: mockUserId,
        completed: true,
      });

      expect(result).toHaveLength(1);
      expect(result[0].completed).toBe(true);
    });

    it('should filter by priority', async () => {
      const mockDbTask = { ...mockTask, completed: 'false', priority: 'high' as const };
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([mockDbTask]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await taskService.listTasks({
        userId: mockUserId,
        priority: 'high',
      });

      expect(result).toHaveLength(1);
      expect(result[0].priority).toBe('high');
    });

    it('should filter by search query', async () => {
      const mockDbTask = { ...mockTask, completed: 'false' };
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([mockDbTask]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await taskService.listTasks({
        userId: mockUserId,
        searchQuery: 'Test',
      });

      expect(result).toHaveLength(1);
      expect(db.select).toHaveBeenCalled();
    });

    it('should mark overdue tasks', async () => {
      const overdueDate = new Date('2025-01-01');
      const mockDbTask = {
        ...mockTask,
        completed: 'false',
        dueDate: overdueDate,
      };
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([mockDbTask]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await taskService.listTasks({
        userId: mockUserId,
      });

      expect(result).toHaveLength(1);
      expect(result[0].isOverdue).toBe(true);
    });

    it('should not mark completed tasks as overdue', async () => {
      const overdueDate = new Date('2025-01-01');
      const mockDbTask = {
        ...mockTask,
        completed: 'true',
        dueDate: overdueDate,
      };
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([mockDbTask]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await taskService.listTasks({
        userId: mockUserId,
      });

      expect(result).toHaveLength(1);
      expect(result[0].isOverdue).toBe(false);
    });
  });

  describe('createTask', () => {
    it('should create a task with all fields', async () => {
      const mockDbTask = { ...mockTask, completed: 'false' };
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockDbTask]),
        }),
      });
      vi.mocked(db.insert).mockImplementation(mockInsert);

      const result = await taskService.createTask({
        userId: mockUserId,
        organizationId: mockOrgId,
        title: 'Test Task',
        description: 'Test Description',
        priority: 'medium',
        dueDate: new Date('2026-12-31'),
      });

      expect(result).toMatchObject({
        id: mockTaskId,
        title: 'Test Task',
        description: 'Test Description',
        completed: false,
        priority: 'medium',
      });
      expect(db.insert).toHaveBeenCalled();
    });

    it('should create a task with minimal fields', async () => {
      const mockDbTask = {
        ...mockTask,
        completed: 'false',
        description: null,
        organizationId: null,
        dueDate: null,
      };
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockDbTask]),
        }),
      });
      vi.mocked(db.insert).mockImplementation(mockInsert);

      const result = await taskService.createTask({
        userId: mockUserId,
        title: 'Test Task',
      });

      expect(result).toMatchObject({
        id: mockTaskId,
        title: 'Test Task',
        completed: false,
        priority: 'medium',
      });
      expect(db.insert).toHaveBeenCalled();
    });

    it('should default priority to medium when not provided', async () => {
      const mockDbTask = { ...mockTask, completed: 'false', priority: 'medium' as const };
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockDbTask]),
        }),
      });
      vi.mocked(db.insert).mockImplementation(mockInsert);

      const result = await taskService.createTask({
        userId: mockUserId,
        title: 'Test Task',
      });

      expect(result.priority).toBe('medium');
    });

    it('should throw error when task creation fails', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });
      vi.mocked(db.insert).mockImplementation(mockInsert);

      await expect(
        taskService.createTask({
          userId: mockUserId,
          title: 'Test Task',
        })
      ).rejects.toThrow('Failed to create task');
    });
  });

  describe('updateTask', () => {
    it('should update a task', async () => {
      const mockDbTask = { ...mockTask, completed: 'false' };
      const mockUpdatedDbTask = { ...mockDbTask, title: 'Updated Task', completed: 'true' };

      // Mock select for verification
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockDbTask]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      // Mock update
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUpdatedDbTask]),
          }),
        }),
      });
      vi.mocked(db.update).mockImplementation(mockUpdate);

      const result = await taskService.updateTask({
        id: mockTaskId,
        userId: mockUserId,
        title: 'Updated Task',
        completed: 'true',
      });

      expect(result).toMatchObject({
        id: mockTaskId,
        title: 'Updated Task',
        completed: true,
      });
      expect(db.select).toHaveBeenCalled();
      expect(db.update).toHaveBeenCalled();
    });

    it('should throw NOT_FOUND when task does not exist', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        taskService.updateTask({
          id: 'non-existent',
          userId: mockUserId,
          title: 'Updated Task',
        })
      ).rejects.toThrow('Task not found or you do not have permission to update it');
    });

    it('should throw NOT_FOUND when task belongs to different user', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        taskService.updateTask({
          id: mockTaskId,
          userId: 'different-user',
          title: 'Updated Task',
        })
      ).rejects.toThrow('Task not found or you do not have permission to update it');
    });

    it('should throw error when update fails', async () => {
      const mockDbTask = { ...mockTask, completed: 'false' };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockDbTask]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      vi.mocked(db.update).mockImplementation(mockUpdate);

      await expect(
        taskService.updateTask({
          id: mockTaskId,
          userId: mockUserId,
          title: 'Updated Task',
        })
      ).rejects.toThrow('Failed to update task');
    });

    it('should update only provided fields', async () => {
      const mockDbTask = { ...mockTask, completed: 'false' };
      const mockUpdatedDbTask = { ...mockDbTask, priority: 'high' as const };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockDbTask]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUpdatedDbTask]),
          }),
        }),
      });
      vi.mocked(db.update).mockImplementation(mockUpdate);

      const result = await taskService.updateTask({
        id: mockTaskId,
        userId: mockUserId,
        priority: 'high',
      });

      expect(result.priority).toBe('high');
      expect(result.title).toBe('Test Task'); // Unchanged
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      const mockDbTask = { ...mockTask, completed: 'false' };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockDbTask]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      const mockDelete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      vi.mocked(db.delete).mockImplementation(mockDelete);

      const result = await taskService.deleteTask({
        id: mockTaskId,
        userId: mockUserId,
      });

      expect(result).toEqual({ success: true });
      expect(db.select).toHaveBeenCalled();
      expect(db.delete).toHaveBeenCalled();
    });

    it('should throw NOT_FOUND when task does not exist', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        taskService.deleteTask({
          id: 'non-existent',
          userId: mockUserId,
        })
      ).rejects.toThrow('Task not found or you do not have permission to delete it');
    });

    it('should throw NOT_FOUND when task belongs to different user', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        taskService.deleteTask({
          id: mockTaskId,
          userId: 'different-user',
        })
      ).rejects.toThrow('Task not found or you do not have permission to delete it');
    });
  });

  describe('error handling', () => {
    it('should throw errors with proper error codes', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      try {
        await taskService.deleteTask({
          id: mockTaskId,
          userId: mockUserId,
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          expect(error.cause).toBe(ERRORS.NOT_FOUND);
        }
      }
    });
  });
});
