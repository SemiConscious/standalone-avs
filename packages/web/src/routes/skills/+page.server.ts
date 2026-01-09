/**
 * Skills Page Server
 * 
 * Uses repository pattern for platform-agnostic data loading.
 */

import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { tryCreateContextAndRepositories } from '$lib/adapters';
import type { Skill } from '$lib/domain';

export interface SkillsPageData {
  skills: Skill[];
  isDemo: boolean;
  error?: string;
}

// Demo data
const DEMO_SKILLS: Skill[] = [
  { id: '1', name: 'English', description: 'English language proficiency', lastModified: '2026-01-05T10:00:00Z' },
  { id: '2', name: 'Spanish', description: 'Spanish language proficiency', lastModified: '2026-01-04T14:30:00Z' },
  { id: '3', name: 'Technical Support', description: 'Technical product support expertise', lastModified: '2026-01-03T09:15:00Z' },
  { id: '4', name: 'Sales', description: 'Sales and account management', lastModified: '2026-01-02T16:45:00Z' },
  { id: '5', name: 'Billing', description: 'Billing and payment inquiries', lastModified: '2026-01-01T11:00:00Z' },
];

export const load: PageServerLoad<SkillsPageData> = async ({ locals }) => {
  const result = tryCreateContextAndRepositories(locals);

  if (!result) {
    return { skills: DEMO_SKILLS, isDemo: true };
  }

  const { repos, isDemo } = result;

  if (isDemo) {
    return { skills: DEMO_SKILLS, isDemo: true };
  }

  try {
    const skillsResult = await repos.skills.findAll({ page: 1, pageSize: 1000 });
    return { skills: skillsResult.items, isDemo: false };
  } catch (error) {
    console.error('Failed to fetch skills:', error);
    return { skills: [], isDemo: false, error: 'Failed to load skills' };
  }
};

export const actions: Actions = {
  create: async ({ locals, request }) => {
    const result = tryCreateContextAndRepositories(locals);
    if (!result) {
      return fail(401, { error: 'Not authenticated' });
    }

    const { repos, isDemo } = result;
    if (isDemo) {
      return fail(400, { error: 'Cannot create skills in demo mode' });
    }

    const formData = await request.formData();
    const name = formData.get('name')?.toString();
    const description = formData.get('description')?.toString() || '';

    if (!name) {
      return fail(400, { error: 'Name is required' });
    }

    try {
      const createResult = await repos.skills.create({
        name,
        description,
      });

      if (!createResult.success) {
        return fail(500, { error: createResult.error || 'Failed to create skill' });
      }

      return { success: true, message: 'Skill created successfully' };
    } catch (error) {
      return fail(500, { error: error instanceof Error ? error.message : 'Failed to create skill' });
    }
  },

  delete: async ({ locals, request }) => {
    const result = tryCreateContextAndRepositories(locals);
    if (!result) {
      return fail(401, { error: 'Not authenticated' });
    }

    const { repos, isDemo } = result;
    if (isDemo) {
      return fail(400, { error: 'Cannot delete skills in demo mode' });
    }

    const formData = await request.formData();
    const skillId = formData.get('skillId')?.toString();

    if (!skillId) {
      return fail(400, { error: 'Skill ID is required' });
    }

    try {
      const deleteResult = await repos.skills.delete(skillId);

      if (!deleteResult.success) {
        return fail(500, { error: deleteResult.error || 'Failed to delete skill' });
      }

      return { success: true, message: 'Skill deleted successfully' };
    } catch (error) {
      return fail(500, { error: error instanceof Error ? error.message : 'Failed to delete skill' });
    }
  },
};
