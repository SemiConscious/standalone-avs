import { describe, it, expect } from 'vitest';
import { UserSchema, CreateUserSchema, UserStatus, PresenceStatus } from '../user';

describe('User Model', () => {
  describe('UserSchema', () => {
    it('should validate a valid user', () => {
      const validUser = {
        id: '123',
        username: 'jsmith',
        email: 'john.smith@example.com',
        firstName: 'John',
        lastName: 'Smith',
        status: 'active',
        groupIds: ['group1'],
        deviceIds: ['device1'],
        licenseTypes: ['standard'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = UserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidUser = {
        id: '123',
        username: 'jsmith',
        email: 'not-an-email',
        firstName: 'John',
        lastName: 'Smith',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should reject invalid status', () => {
      const invalidUser = {
        id: '123',
        username: 'jsmith',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Smith',
        status: 'invalid-status',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should default optional arrays to empty', () => {
      const user = {
        id: '123',
        username: 'jsmith',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Smith',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = UserSchema.parse(user);
      expect(result.groupIds).toEqual([]);
      expect(result.deviceIds).toEqual([]);
      expect(result.licenseTypes).toEqual([]);
    });

    it('should coerce date strings to Date objects', () => {
      const user = {
        id: '123',
        username: 'jsmith',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Smith',
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      };

      const result = UserSchema.parse(user);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('CreateUserSchema', () => {
    it('should not require id, createdAt, updatedAt', () => {
      const newUser = {
        username: 'jsmith',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Smith',
      };

      const result = CreateUserSchema.safeParse(newUser);
      expect(result.success).toBe(true);
    });
  });

  describe('UserStatus enum', () => {
    it('should have correct values', () => {
      expect(UserStatus.Active).toBe('active');
      expect(UserStatus.Inactive).toBe('inactive');
      expect(UserStatus.Pending).toBe('pending');
      expect(UserStatus.Suspended).toBe('suspended');
    });
  });

  describe('PresenceStatus enum', () => {
    it('should have correct values', () => {
      expect(PresenceStatus.Available).toBe('available');
      expect(PresenceStatus.Busy).toBe('busy');
      expect(PresenceStatus.Away).toBe('away');
      expect(PresenceStatus.DoNotDisturb).toBe('dnd');
      expect(PresenceStatus.Offline).toBe('offline');
    });
  });
});

