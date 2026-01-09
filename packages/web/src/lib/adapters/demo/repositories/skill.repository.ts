/**
 * Demo Skill Repository Implementation
 */

import type { ISkillRepository, SkillQueryParams } from '$lib/repositories';
import type {
  Skill,
  CreateSkillInput,
  UpdateSkillInput,
  PaginatedResult,
  MutationResult,
  DeleteResult,
} from '$lib/domain';
import { createPaginationMeta } from '$lib/domain';

// Demo skill data
const DEMO_SKILLS: Skill[] = [
  {
    id: 'demo-sk001',
    name: 'Technical Support',
    description: 'Advanced technical troubleshooting',
    sapienId: 1001,
    lastModified: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'demo-sk002',
    name: 'Sales',
    description: 'Sales and product inquiries',
    sapienId: 1002,
    lastModified: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'demo-sk003',
    name: 'Billing',
    description: 'Billing and payment questions',
    sapienId: 1003,
    lastModified: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    id: 'demo-sk004',
    name: 'French',
    description: 'French language support',
    sapienId: 1004,
    lastModified: new Date(Date.now() - 345600000).toISOString(),
  },
  {
    id: 'demo-sk005',
    name: 'Spanish',
    description: 'Spanish language support',
    sapienId: 1005,
    lastModified: new Date(Date.now() - 432000000).toISOString(),
  },
];

export class DemoSkillRepository implements ISkillRepository {
  private skills: Skill[] = [...DEMO_SKILLS];
  private nextId = 100;

  async findAll(params: SkillQueryParams): Promise<PaginatedResult<Skill>> {
    let filtered = [...this.skills];

    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(searchLower) ||
        s.description.toLowerCase().includes(searchLower)
      );
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

  async findById(id: string): Promise<Skill | null> {
    return this.skills.find(s => s.id === id) || null;
  }

  async create(data: CreateSkillInput): Promise<MutationResult<Skill>> {
    const id = `demo-sk${String(this.nextId++).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const skill: Skill = {
      id,
      name: data.name,
      description: data.description || '',
      sapienId: this.nextId + 1000,
      lastModified: now,
    };

    this.skills.push(skill);
    return { success: true, data: skill };
  }

  async update(id: string, data: UpdateSkillInput): Promise<MutationResult<Skill>> {
    const index = this.skills.findIndex(s => s.id === id);
    if (index === -1) return { success: false, error: 'Skill not found' };

    const skill = this.skills[index];
    if (data.name !== undefined) skill.name = data.name;
    if (data.description !== undefined) skill.description = data.description;
    skill.lastModified = new Date().toISOString();

    return { success: true, data: skill };
  }

  async delete(id: string): Promise<DeleteResult> {
    const index = this.skills.findIndex(s => s.id === id);
    if (index === -1) return { success: false, error: 'Skill not found' };

    this.skills.splice(index, 1);
    return { success: true };
  }
}
