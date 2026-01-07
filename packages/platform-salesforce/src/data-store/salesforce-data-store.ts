import {
  type IDataStore,
  type QueryFilter,
  type QueryOptions,
  type QueryResult,
  type BatchResult,
  type FilterOperator,
  AuthenticationError,
  NotFoundError,
  ValidationError,
} from '@avs/core';
import { type SalesforceAuthProvider } from '../auth/salesforce-auth.js';

/**
 * Map filter operators to SOQL operators
 */
const OPERATOR_MAP: Record<FilterOperator, string> = {
  eq: '=',
  neq: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  like: 'LIKE',
  in: 'IN',
  notIn: 'NOT IN',
  isNull: '= null',
  isNotNull: '!= null',
};

/**
 * Salesforce data store implementation
 * Uses jsforce to interact with Salesforce REST API and SOQL
 */
export class SalesforceDataStore implements IDataStore {
  constructor(private authProvider: SalesforceAuthProvider) {}

  private getConnection() {
    if (!this.authProvider.isAuthenticated()) {
      throw new AuthenticationError('Not authenticated');
    }
    return this.authProvider.getConnection();
  }

  async query<T>(
    entity: string,
    filters: QueryFilter[],
    options?: QueryOptions
  ): Promise<QueryResult<T>> {
    const conn = this.getConnection();

    // Build SOQL query
    const fields = options?.fields?.join(', ') ?? 'Id';
    let soql = `SELECT ${fields} FROM ${entity}`;

    // Add WHERE clause
    if (filters.length > 0) {
      const whereClauses = filters.map((filter) => this.buildWhereClause(filter));
      soql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // Add ORDER BY
    if (options?.orderBy && options.orderBy.length > 0) {
      const orderClauses = options.orderBy.map(
        (o) => `${o.field} ${o.direction.toUpperCase()}`
      );
      soql += ` ORDER BY ${orderClauses.join(', ')}`;
    }

    // Add LIMIT and OFFSET
    if (options?.limit) {
      soql += ` LIMIT ${options.limit}`;
    }
    if (options?.offset) {
      soql += ` OFFSET ${options.offset}`;
    }

    const result = await conn.query<T>(soql);

    return {
      records: result.records,
      totalCount: result.totalSize,
      hasMore: !result.done,
      nextOffset: options?.offset ? options.offset + result.records.length : result.records.length,
    };
  }

  async get<T>(entity: string, id: string, fields?: string[]): Promise<T | null> {
    const conn = this.getConnection();

    try {
      if (fields && fields.length > 0) {
        // Use SOQL to get specific fields
        const soql = `SELECT ${fields.join(', ')} FROM ${entity} WHERE Id = '${id}'`;
        const result = await conn.query<T>(soql);
        return result.records[0] ?? null;
      }

      // Use retrieve for all fields
      const record = await conn.sobject(entity).retrieve(id);
      return record as T;
    } catch (error) {
      if (String(error).includes('NOT_FOUND') || String(error).includes('INVALID_ID')) {
        return null;
      }
      throw error;
    }
  }

  async create<T>(entity: string, data: Partial<T>): Promise<T> {
    const conn = this.getConnection();

    const result = await conn.sobject(entity).create(data as jsforce.Record);

    if (!result.success) {
      const errors = result.errors?.map((e) => ({
        field: e.fields?.[0] ?? 'unknown',
        message: e.message,
      })) ?? [];
      throw new ValidationError('Failed to create record', errors);
    }

    // Retrieve the created record
    const created = await this.get<T>(entity, result.id);
    if (!created) {
      throw new NotFoundError(entity, result.id);
    }

    return created;
  }

  async update<T>(entity: string, id: string, data: Partial<T>): Promise<T> {
    const conn = this.getConnection();

    const result = await conn.sobject(entity).update({ Id: id, ...data } as jsforce.Record);

    if (!result.success) {
      const errors = result.errors?.map((e) => ({
        field: e.fields?.[0] ?? 'unknown',
        message: e.message,
      })) ?? [];
      throw new ValidationError('Failed to update record', errors);
    }

    // Retrieve the updated record
    const updated = await this.get<T>(entity, id);
    if (!updated) {
      throw new NotFoundError(entity, id);
    }

    return updated;
  }

  async delete(entity: string, id: string): Promise<void> {
    const conn = this.getConnection();

    const result = await conn.sobject(entity).destroy(id);

    if (!result.success) {
      const errors = result.errors?.map((e) => ({
        field: e.fields?.[0] ?? 'unknown',
        message: e.message,
      })) ?? [];
      throw new ValidationError('Failed to delete record', errors);
    }
  }

  async upsert<T>(entity: string, externalIdField: string, data: Partial<T>): Promise<T> {
    const conn = this.getConnection();

    const result = await conn.sobject(entity).upsert(data as jsforce.Record, externalIdField);

    if (!result.success) {
      const errors = result.errors?.map((e) => ({
        field: e.fields?.[0] ?? 'unknown',
        message: e.message,
      })) ?? [];
      throw new ValidationError('Failed to upsert record', errors);
    }

    // Retrieve the upserted record
    const upserted = await this.get<T>(entity, result.id);
    if (!upserted) {
      throw new NotFoundError(entity, result.id);
    }

    return upserted;
  }

  async batch<T>(
    operations: Array<{
      type: 'create' | 'update' | 'delete';
      entity: string;
      id?: string;
      data?: Partial<T>;
    }>
  ): Promise<BatchResult<T>[]> {
    const conn = this.getConnection();
    const results: BatchResult<T>[] = [];

    // Group operations by entity and type for bulk operations
    // For now, execute sequentially - can be optimized with Composite API

    for (const op of operations) {
      try {
        switch (op.type) {
          case 'create': {
            const created = await this.create<T>(op.entity, op.data!);
            results.push({
              success: true,
              id: (created as { Id?: string }).Id,
              record: created,
            });
            break;
          }
          case 'update': {
            const updated = await this.update<T>(op.entity, op.id!, op.data!);
            results.push({
              success: true,
              id: op.id,
              record: updated,
            });
            break;
          }
          case 'delete': {
            await this.delete(op.entity, op.id!);
            results.push({
              success: true,
              id: op.id,
            });
            break;
          }
        }
      } catch (error) {
        results.push({
          success: false,
          id: op.id,
          errors: [{ message: String(error) }],
        });
      }
    }

    return results;
  }

  async rawQuery<T>(query: string): Promise<T[]> {
    const conn = this.getConnection();
    const result = await conn.query<T>(query);
    return result.records;
  }

  /**
   * Build a SOQL WHERE clause from a QueryFilter
   */
  private buildWhereClause(filter: QueryFilter): string {
    const operator = OPERATOR_MAP[filter.operator];

    if (filter.operator === 'isNull' || filter.operator === 'isNotNull') {
      return `${filter.field} ${operator}`;
    }

    if (filter.operator === 'in' || filter.operator === 'notIn') {
      const values = (filter.value as unknown[])
        .map((v) => this.formatValue(v))
        .join(', ');
      return `${filter.field} ${operator} (${values})`;
    }

    if (filter.operator === 'like') {
      return `${filter.field} ${operator} '${String(filter.value)}'`;
    }

    return `${filter.field} ${operator} ${this.formatValue(filter.value)}`;
  }

  /**
   * Format a value for SOQL
   */
  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'string') {
      // Escape single quotes
      return `'${value.replace(/'/g, "\\'")}'`;
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return String(value);
  }
}

