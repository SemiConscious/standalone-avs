/**
 * Salesforce Device Repository Implementation
 */

import type { IDeviceRepository, DeviceQueryParams } from '$lib/repositories';
import type {
  Device,
  CreateDeviceInput,
  UpdateDeviceInput,
  DeviceMapping,
  PaginatedResult,
  MutationResult,
  DeleteResult,
} from '$lib/domain';
import { createPaginationMeta } from '$lib/domain';
import type { SalesforceAdapterContext } from '../../types';
import { SalesforceClient } from '../client';
import type { SalesforceDeviceRecord, SalesforceDeviceMappingRecord } from '../types';
import { mapSalesforceDevice, mapSalesforceDeviceMapping, mapCreateDeviceToSalesforce, mapUpdateDeviceToSalesforce } from '../mappers/device.mapper';
import { buildDeviceListQuery, buildDeviceCountQuery, buildDeviceByIdQuery, buildDeviceByExtensionQuery, buildDeviceByMacQuery, buildDevicesForUserQuery } from '../queries/device.queries';

export class SalesforceDeviceRepository implements IDeviceRepository {
  private client: SalesforceClient;
  private ns: string;

  constructor(ctx: SalesforceAdapterContext) {
    this.client = new SalesforceClient(ctx);
    this.ns = ctx.namespace;
  }

  async findAll(params: DeviceQueryParams): Promise<PaginatedResult<Device>> {
    const countSoql = buildDeviceCountQuery(this.ns, params);
    const countResult = await this.client.query<Record<string, unknown>>(countSoql);
    const totalCount = countResult.totalSize;

    const listSoql = buildDeviceListQuery(this.ns, params);
    const listResult = await this.client.query<SalesforceDeviceRecord>(listSoql);

    return {
      items: listResult.records.map(mapSalesforceDevice),
      pagination: createPaginationMeta(params.page, params.pageSize, totalCount),
    };
  }

  async findById(id: string): Promise<Device | null> {
    const soql = buildDeviceByIdQuery(this.ns, id);
    const result = await this.client.query<SalesforceDeviceRecord>(soql);
    return result.records.length > 0 ? mapSalesforceDevice(result.records[0]) : null;
  }

  async findByExtension(extension: string): Promise<Device | null> {
    const soql = buildDeviceByExtensionQuery(this.ns, extension);
    const result = await this.client.query<SalesforceDeviceRecord>(soql);
    return result.records.length > 0 ? mapSalesforceDevice(result.records[0]) : null;
  }

  async findByMacAddress(macAddress: string): Promise<Device | null> {
    const soql = buildDeviceByMacQuery(this.ns, macAddress);
    const result = await this.client.query<SalesforceDeviceRecord>(soql);
    return result.records.length > 0 ? mapSalesforceDevice(result.records[0]) : null;
  }

  async create(data: CreateDeviceInput): Promise<MutationResult<Device>> {
    try {
      const sfData = mapCreateDeviceToSalesforce(data, this.ns);
      const result = await this.client.create('Device__c', sfData);

      if (!result.success) {
        return { success: false, error: result.errors?.map(e => e.message).join('; ') || 'Failed to create device' };
      }

      // Assign to user if specified
      if (data.assignedUserId) {
        await this.assignToUser(result.id, data.assignedUserId);
      }

      const device = await this.findById(result.id);
      return { success: true, data: device! };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create device' };
    }
  }

  async update(id: string, data: UpdateDeviceInput): Promise<MutationResult<Device>> {
    try {
      const sfData = mapUpdateDeviceToSalesforce(data, this.ns);
      await this.client.update('Device__c', id, sfData);

      const device = await this.findById(id);
      return { success: true, data: device! };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update device' };
    }
  }

  async delete(id: string): Promise<DeleteResult> {
    try {
      await this.client.delete('Device__c', id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete device' };
    }
  }

  async getMappings(deviceId: string): Promise<DeviceMapping[]> {
    const soql = `SELECT Id, ${this.ns}__Device__c, ${this.ns}__User__c, ${this.ns}__User__r.Name FROM ${this.ns}__DeviceMapping__c WHERE ${this.ns}__Device__c = '${deviceId}'`;
    const result = await this.client.query<SalesforceDeviceMappingRecord>(soql);
    return result.records.map(mapSalesforceDeviceMapping);
  }

  async assignToUser(deviceId: string, userId: string): Promise<MutationResult<DeviceMapping>> {
    try {
      const sfData = {
        [`${this.ns}__Device__c`]: deviceId,
        [`${this.ns}__User__c`]: userId,
      };
      const result = await this.client.create('DeviceMapping__c', sfData);

      if (!result.success) {
        return { success: false, error: 'Failed to assign device to user' };
      }

      return {
        success: true,
        data: { id: result.id, deviceId, userId },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to assign device' };
    }
  }

  async unassignFromUser(deviceId: string, userId: string): Promise<DeleteResult> {
    try {
      const soql = `SELECT Id FROM ${this.ns}__DeviceMapping__c WHERE ${this.ns}__Device__c = '${deviceId}' AND ${this.ns}__User__c = '${userId}' LIMIT 1`;
      const result = await this.client.query<{ Id: string }>(soql);

      if (result.records.length === 0) {
        return { success: false, error: 'Device mapping not found' };
      }

      await this.client.delete('DeviceMapping__c', result.records[0].Id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to unassign device' };
    }
  }

  async getDevicesForUser(userId: string): Promise<Device[]> {
    const soql = buildDevicesForUserQuery(this.ns, userId);
    const result = await this.client.query<{ nbavs__Device__c: string }>(soql);
    
    const deviceIds = result.records.map(r => r.nbavs__Device__c);
    if (deviceIds.length === 0) return [];

    const devices: Device[] = [];
    for (const id of deviceIds) {
      const device = await this.findById(id);
      if (device) devices.push(device);
    }
    return devices;
  }

  async syncRegistrationStatus(deviceId: string): Promise<MutationResult<Device>> {
    // In a full implementation, this would call the Sapien API
    const device = await this.findById(deviceId);
    if (!device) {
      return { success: false, error: 'Device not found' };
    }
    return { success: true, data: device };
  }

  async toggleEnabled(id: string): Promise<MutationResult<{ enabled: boolean }>> {
    try {
      const device = await this.findById(id);
      if (!device) {
        return { success: false, error: 'Device not found' };
      }

      const newEnabled = !device.enabled;
      await this.client.update('Device__c', id, {
        [`${this.ns}__Enabled__c`]: newEnabled,
      });

      return { success: true, data: { enabled: newEnabled } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to toggle device' };
    }
  }

  async isExtensionAvailable(extension: string, excludeDeviceId?: string): Promise<boolean> {
    // Check devices
    let deviceSoql = `SELECT Id FROM ${this.ns}__Device__c WHERE ${this.ns}__Extension__c = '${extension}'`;
    if (excludeDeviceId) deviceSoql += ` AND Id != '${excludeDeviceId}'`;
    deviceSoql += ' LIMIT 1';
    const deviceResult = await this.client.query<{ Id: string }>(deviceSoql);
    if (deviceResult.records.length > 0) return false;

    // Check users
    const userSoql = `SELECT Id FROM ${this.ns}__User__c WHERE ${this.ns}__SipExtension__c = '${extension}' LIMIT 1`;
    const userResult = await this.client.query<{ Id: string }>(userSoql);
    if (userResult.records.length > 0) return false;

    // Check groups
    const groupSoql = `SELECT Id FROM ${this.ns}__Group__c WHERE ${this.ns}__Extension__c = '${extension}' LIMIT 1`;
    const groupResult = await this.client.query<{ Id: string }>(groupSoql);
    return groupResult.records.length === 0;
  }
}
