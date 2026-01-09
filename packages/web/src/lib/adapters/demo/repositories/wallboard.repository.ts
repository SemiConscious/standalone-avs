/**
 * Demo Wallboard Repository Implementation
 */

import type { IWallboardRepository, WallboardQueryParams } from '$lib/repositories';
import type {
  Wallboard,
  CreateWallboardInput,
  UpdateWallboardInput,
  PaginatedResult,
  MutationResult,
  DeleteResult,
} from '$lib/domain';
import { createPaginationMeta } from '$lib/domain';

// Demo wallboard data
const DEMO_WALLBOARDS: Wallboard[] = [
  {
    id: 'demo-wb001',
    name: 'Sales Queue Dashboard',
    description: 'Real-time view of the sales queue',
    type: 'queue',
    enabled: true,
    lastModified: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'demo-wb002',
    name: 'Support Agents Overview',
    description: 'Agent availability and call status',
    type: 'agent',
    enabled: true,
    lastModified: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'demo-wb003',
    name: 'Executive Summary',
    description: 'Custom KPI dashboard for executives',
    type: 'custom',
    enabled: false,
    lastModified: new Date(Date.now() - 259200000).toISOString(),
  },
];

export class DemoWallboardRepository implements IWallboardRepository {
  private wallboards: Wallboard[] = [...DEMO_WALLBOARDS];
  private nextId = 100;

  async findAll(params: WallboardQueryParams): Promise<PaginatedResult<Wallboard>> {
    let filtered = [...this.wallboards];

    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filtered = filtered.filter(w =>
        w.name.toLowerCase().includes(searchLower) ||
        w.description.toLowerCase().includes(searchLower)
      );
    }

    if (params.filters?.enabled !== undefined) {
      filtered = filtered.filter(w => w.enabled === params.filters!.enabled);
    }
    if (params.filters?.type) {
      filtered = filtered.filter(w => w.type === params.filters!.type);
    }

    // Sort by name
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    const totalCount = filtered.length;
    const start = (params.page - 1) * params.pageSize;
    const paginated = filtered.slice(start, start + params.pageSize);

    return {
      items: paginated,
      pagination: createPaginationMeta(params.page, params.pageSize, totalCount),
    };
  }

  async findById(id: string): Promise<Wallboard | null> {
    return this.wallboards.find(w => w.id === id) || null;
  }

  async create(data: CreateWallboardInput): Promise<MutationResult<Wallboard>> {
    const id = `demo-wb${String(this.nextId++).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const wallboard: Wallboard = {
      id,
      name: data.name,
      description: data.description || '',
      type: data.type || 'custom',
      enabled: data.enabled ?? true,
      configuration: data.configuration,
      lastModified: now,
    };

    this.wallboards.push(wallboard);
    return { success: true, data: wallboard };
  }

  async update(id: string, data: UpdateWallboardInput): Promise<MutationResult<Wallboard>> {
    const index = this.wallboards.findIndex(w => w.id === id);
    if (index === -1) return { success: false, error: 'Wallboard not found' };

    const wallboard = this.wallboards[index];
    if (data.name !== undefined) wallboard.name = data.name;
    if (data.description !== undefined) wallboard.description = data.description;
    if (data.type !== undefined) wallboard.type = data.type;
    if (data.enabled !== undefined) wallboard.enabled = data.enabled;
    if (data.configuration !== undefined) wallboard.configuration = data.configuration;
    wallboard.lastModified = new Date().toISOString();

    return { success: true, data: wallboard };
  }

  async delete(id: string): Promise<DeleteResult> {
    const index = this.wallboards.findIndex(w => w.id === id);
    if (index === -1) return { success: false, error: 'Wallboard not found' };

    this.wallboards.splice(index, 1);
    return { success: true };
  }

  async toggleEnabled(id: string): Promise<MutationResult<{ enabled: boolean }>> {
    const wallboard = this.wallboards.find(w => w.id === id);
    if (!wallboard) {
      return { success: false, error: 'Wallboard not found' };
    }

    wallboard.enabled = !wallboard.enabled;
    wallboard.lastModified = new Date().toISOString();

    return { success: true, data: { enabled: wallboard.enabled } };
  }
}
