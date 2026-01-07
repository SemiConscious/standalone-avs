import { describe, it, expect } from 'vitest';
import {
  AvsError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  ConfigurationError,
  PlatformError,
} from '../index';

describe('Error Classes', () => {
  describe('AvsError', () => {
    it('should create error with all properties', () => {
      const error = new AvsError('Test error', 'TEST_ERROR', 500, { foo: 'bar' });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({ foo: 'bar' });
      expect(error.name).toBe('AvsError');
    });

    it('should serialize to JSON', () => {
      const error = new AvsError('Test error', 'TEST_ERROR', 400, { field: 'value' });
      const json = error.toJSON();

      expect(json).toEqual({
        name: 'AvsError',
        message: 'Test error',
        code: 'TEST_ERROR',
        statusCode: 400,
        details: { field: 'value' },
      });
    });

    it('should be instanceof Error', () => {
      const error = new AvsError('Test', 'TEST', 500);
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AvsError);
    });
  });

  describe('AuthenticationError', () => {
    it('should have correct defaults', () => {
      const error = new AuthenticationError();

      expect(error.message).toBe('Authentication failed');
      expect(error.code).toBe('AUTH_ERROR');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('AuthenticationError');
    });

    it('should accept custom message', () => {
      const error = new AuthenticationError('Invalid token');
      expect(error.message).toBe('Invalid token');
    });
  });

  describe('AuthorizationError', () => {
    it('should have correct defaults', () => {
      const error = new AuthorizationError();

      expect(error.message).toBe('Access denied');
      expect(error.code).toBe('AUTHORIZATION_ERROR');
      expect(error.statusCode).toBe(403);
    });
  });

  describe('NotFoundError', () => {
    it('should format message with resource and id', () => {
      const error = new NotFoundError('User', '123');

      expect(error.message).toBe("User with id '123' not found");
      expect(error.statusCode).toBe(404);
    });

    it('should format message without id', () => {
      const error = new NotFoundError('Configuration');

      expect(error.message).toBe('Configuration not found');
    });
  });

  describe('ValidationError', () => {
    it('should include validation errors', () => {
      const validationErrors = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'name', message: 'Name is required' },
      ];
      const error = new ValidationError('Validation failed', validationErrors);

      expect(error.validationErrors).toEqual(validationErrors);
      expect(error.statusCode).toBe(400);
      expect(error.details?.validationErrors).toEqual(validationErrors);
    });
  });

  describe('ConflictError', () => {
    it('should have correct defaults', () => {
      const error = new ConflictError();

      expect(error.message).toBe('Resource conflict');
      expect(error.statusCode).toBe(409);
    });
  });

  describe('RateLimitError', () => {
    it('should include retry after', () => {
      const error = new RateLimitError('Too many requests', 60);

      expect(error.retryAfter).toBe(60);
      expect(error.statusCode).toBe(429);
    });
  });

  describe('ExternalServiceError', () => {
    it('should include service name', () => {
      const originalError = new Error('Connection refused');
      const error = new ExternalServiceError('Salesforce', 'API call failed', originalError);

      expect(error.serviceName).toBe('Salesforce');
      expect(error.originalError).toBe(originalError);
      expect(error.statusCode).toBe(502);
    });
  });

  describe('ConfigurationError', () => {
    it('should have 500 status code', () => {
      const error = new ConfigurationError('Missing API key');

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('CONFIGURATION_ERROR');
    });
  });

  describe('PlatformError', () => {
    it('should include platform name', () => {
      const error = new PlatformError('salesforce', 'SOQL query failed', 400);

      expect(error.platform).toBe('salesforce');
      expect(error.statusCode).toBe(400);
    });
  });
});

