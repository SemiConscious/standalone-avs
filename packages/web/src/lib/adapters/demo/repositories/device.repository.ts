/**
 * Demo Device Repository Implementation
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
import { createPaginationMeta, formatMacAddress } from '$lib/domain';
import { DEMO_DEVICES, DEMO_DEVICE_MAPPINGS } from '../data/devices';

export class DemoDeviceRepository implements IDeviceRepository {
  private devices: Device[] = [...DEMO_DEVICES];
  private mappings: DeviceMapping[] = [...DEMO_DEVICE_MAPPINGS];
  private nextId = 100;

  async findAll(params: DeviceQueryParams): Promise<PaginatedResult<Device>> {
    let filtered = [...this.devices];

    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filtered = filtered.filter(d =>
        d.extension.includes(params.search!) ||
        d.description.toLowerCase().includes(searchLower) ||
        d.location.toLowerCase().includes(searchLower)
      );
    }

    if (params.filters?.type) {
      filtered = filtered.filter(d => d.type === params.filters!.type);
    }
    if (params.filters?.enabled !== undefined) {
      filtered = filtered.filter(d => d.enabled === params.filters!.enabled);
    }
    if (params.filters?.registered !== undefined) {
      filtered = filtered.filter(d => d.registered === params.filters!.registered);
    }
    if (params.filters?.assignedUserId) {
      filtered = filtered.filter(d => d.assignedUserId === params.filters!.assignedUserId);
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = params.sortBy === 'extension' ? a.extension : a.lastModified;
      const bVal = params.sortBy === 'extension' ? b.extension : b.lastModified;
      const cmp = aVal.localeCompare(bVal);
      return params.sortOrder === 'asc' ? cmp : -cmp;
    });

    const totalCount = filtered.length;
    const start = (params.page - 1) * params.pageSize;
    const paginated = filtered.slice(start, start + params.pageSize);

    return {
      items: paginated,
      pagination: createPaginationMeta(params.page, params.pageSize, totalCount),
    };
  }

  async findById(id: string): Promise<Device | null> {
    return this.devices.find(d => d.id === id) || null;
  }

  async findByExtension(extension: string): Promise<Device | null> {
    return this.devices.find(d => d.extension === extension) || null;
  }

  async findByMacAddress(macAddress: string): Promise<Device | null> {
    const normalized = formatMacAddress(macAddress);
    return this.devices.find(d => d.macAddress === normalized) || null;
  }

  async create(data: CreateDeviceInput): Promise<MutationResult<Device>> {
    const id = `demo-d${String(this.nextId++).padStart(3, '0')}`;
    const device: Device = {
      id,
      platformId: this.nextId,
      extension: data.extension,
      location: data.location || '',
      description: data.description || '',
      type: data.type || 'SIP',
      model: data.model || '',
      macAddress: formatMacAddress(data.macAddress),
      enabled: data.enabled ?? true,
      registered: false,
      lastModified: new Date().toISOString(),
      assignedUserId: data.assignedUserId,
    };
    this.devices.push(device);

    if (data.assignedUserId) {
      this.mappings.push({
        id: `demo-dm${String(this.nextId++).padStart(3, '0')}`,
        deviceId: id,
        userId: data.assignedUserId,
      });
    }

    return { success: true, data: device };
  }

  async update(id: string, data: UpdateDeviceInput): Promise<MutationResult<Device>> {
    const index = this.devices.findIndex(d => d.id === id);
    if (index === -1) return { success: false, error: 'Device not found' };

    this.devices[index] = {
      ...this.devices[index],
      ...data,
      macAddress: data.macAddress !== undefined ? formatMacAddress(data.macAddress) : this.devices[index].macAddress,
      lastModified: new Date().toISOString(),
    };
    return { success: true, data: this.devices[index] };
  }

  async delete(id: string): Promise<DeleteResult> {
    const index = this.devices.findIndex(d => d.id === id);
    if (index === -1) return { success: false, error: 'Device not found' };
    this.devices.splice(index, 1);
    this.mappings = this.mappings.filter(m => m.deviceId !== id);
    return { success: true };
  }

  async getMappings(deviceId: string): Promise<DeviceMapping[]> {
    return this.mappings.filter(m => m.deviceId === deviceId);
  }

  async assignToUser(deviceId: string, userId: string): Promise<MutationResult<DeviceMapping>> {
    const id = `demo-dm${String(this.nextId++).padStart(3, '0')}`;
    const mapping: DeviceMapping = { id, deviceId, userId };
    this.mappings.push(mapping);

    const device = this.devices.find(d => d.id === deviceId);
    if (device) {
      device.assignedUserId = userId;
    }

    return { success: true, data: mapping };
  }

  async unassignFromUser(deviceId: string, userId: string): Promise<DeleteResult> {
    const index = this.mappings.findIndex(m => m.deviceId === deviceId && m.userId === userId);
    if (index === -1) return { success: false, error: 'Mapping not found' };
    this.mappings.splice(index, 1);

    const device = this.devices.find(d => d.id === deviceId);
    if (device && device.assignedUserId === userId) {
      device.assignedUserId = undefined;
      device.assignedUserName = undefined;
    }

    return { success: true };
  }

  async getDevicesForUser(userId: string): Promise<Device[]> {
    const deviceIds = this.mappings.filter(m => m.userId === userId).map(m => m.deviceId);
    return this.devices.filter(d => deviceIds.includes(d.id));
  }

  async syncRegistrationStatus(deviceId: string): Promise<MutationResult<Device>> {
    const device = await this.findById(deviceId);
    return device ? { success: true, data: device } : { success: false, error: 'Device not found' };
  }

  async toggleEnabled(id: string): Promise<MutationResult<{ enabled: boolean }>> {
    const device = this.devices.find(d => d.id === id);
    if (!device) return { success: false, error: 'Device not found' };
    device.enabled = !device.enabled;
    return { success: true, data: { enabled: device.enabled } };
  }

  async isExtensionAvailable(extension: string, excludeDeviceId?: string): Promise<boolean> {
    return !this.devices.some(d => d.extension === extension && d.id !== excludeDeviceId);
  }
}
