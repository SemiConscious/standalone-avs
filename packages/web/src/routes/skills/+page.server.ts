import type { PageServerLoad, Actions } from './$types';
import { hasValidCredentials, querySalesforce, createSalesforce, updateSalesforce, deleteSalesforce } from '$lib/server/salesforce';
import { env } from '$env/dynamic/private';
import { fail } from '@sveltejs/kit';

const NAMESPACE = env.SALESFORCE_PACKAGE_NAMESPACE || 'nbavs';

interface SalesforceSkill {
  Id: string;
  Name: string;
  nbavs__Id__c: number;
  nbavs__Description__c: string;
  nbavs__Category__c: string;
}

interface SkillAssignment {
  Id: string;
  nbavs__User__c: string;
  nbavs__User__r: {
    Name: string;
  };
  nbavs__Level__c: number;
}

export interface Skill {
  id: string;
  sapienId: number;
  name: string;
  description: string;
  category: string;
  userCount: number;
}

export interface SkillDetail extends Skill {
  assignments: {
    id: string;
    userId: string;
    userName: string;
    level: number;
  }[];
}

// Demo data
const DEMO_SKILLS: Skill[] = [
  { id: 's001', sapienId: 1, name: 'Spanish', description: 'Spanish language support', category: 'Language', userCount: 5 },
  { id: 's002', sapienId: 2, name: 'French', description: 'French language support', category: 'Language', userCount: 3 },
  { id: 's003', sapienId: 3, name: 'German', description: 'German language support', category: 'Language', userCount: 2 },
  { id: 's004', sapienId: 4, name: 'Technical Support', description: 'Advanced technical troubleshooting', category: 'Technical', userCount: 8 },
  { id: 's005', sapienId: 5, name: 'Billing', description: 'Billing and payment inquiries', category: 'Sales', userCount: 6 },
  { id: 's006', sapienId: 6, name: 'Enterprise Sales', description: 'Enterprise account handling', category: 'Sales', userCount: 4 },
  { id: 's007', sapienId: 7, name: 'API Support', description: 'API and integration support', category: 'Technical', userCount: 3 },
  { id: 's008', sapienId: 8, name: 'VIP', description: 'VIP customer handling', category: 'Service', userCount: 2 },
];

export interface SkillsPageData {
  skills: Skill[];
  categories: string[];
  isDemo: boolean;
  error?: string;
}

export const load: PageServerLoad = async ({ locals }) => {
  // Demo mode
  if (env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1') {
    const categories = [...new Set(DEMO_SKILLS.map(s => s.category))];
    return {
      skills: DEMO_SKILLS,
      categories,
      isDemo: true,
    } satisfies SkillsPageData;
  }

  if (!hasValidCredentials(locals)) {
    return {
      skills: [],
      categories: [],
      isDemo: false,
      error: 'Not authenticated',
    } satisfies SkillsPageData;
  }

  try {
    // Fetch skills
    const skillSoql = `
      SELECT Id, Name, ${NAMESPACE}__Id__c,
             ${NAMESPACE}__Description__c, ${NAMESPACE}__Category__c
      FROM ${NAMESPACE}__Skill__c
      ORDER BY ${NAMESPACE}__Category__c, Name
      LIMIT 500
    `;

    const skillResult = await querySalesforce<SalesforceSkill>(
      locals.instanceUrl!,
      locals.accessToken!,
      skillSoql
    );

    // Count assignments per skill
    const skillIds = skillResult.records.map(s => `'${s.Id}'`).join(',');
    let assignmentCounts: Map<string, number> = new Map();

    if (skillIds.length > 0) {
      try {
        const countSoql = `
          SELECT ${NAMESPACE}__Skill__c, COUNT(Id) cnt
          FROM ${NAMESPACE}__SkillAssignment__c
          WHERE ${NAMESPACE}__Skill__c IN (${skillIds})
          GROUP BY ${NAMESPACE}__Skill__c
        `;
        const countResult = await querySalesforce<{ nbavs__Skill__c: string; cnt: number }>(
          locals.instanceUrl!,
          locals.accessToken!,
          countSoql
        );

        for (const row of countResult.records) {
          assignmentCounts.set(row.nbavs__Skill__c, row.cnt);
        }
      } catch (e) {
        console.warn('Failed to get skill assignment counts:', e);
      }
    }

    const skills: Skill[] = skillResult.records.map(sfSkill => ({
      id: sfSkill.Id,
      sapienId: sfSkill.nbavs__Id__c || 0,
      name: sfSkill.Name || '',
      description: sfSkill.nbavs__Description__c || '',
      category: sfSkill.nbavs__Category__c || 'Uncategorized',
      userCount: assignmentCounts.get(sfSkill.Id) || 0,
    }));

    const categories = [...new Set(skills.map(s => s.category))].sort();

    return {
      skills,
      categories,
      isDemo: false,
    } satisfies SkillsPageData;
  } catch (e) {
    console.error('Failed to load skills:', e);
    return {
      skills: [],
      categories: [],
      isDemo: false,
      error: e instanceof Error ? e.message : 'Failed to load skills',
    } satisfies SkillsPageData;
  }
};

export const actions: Actions = {
  create: async ({ locals, request }) => {
    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;

    if (!name) {
      return fail(400, { error: 'Name is required' });
    }

    try {
      await createSalesforce(
        locals.instanceUrl!,
        locals.accessToken!,
        `${NAMESPACE}__Skill__c`,
        {
          Name: name,
          [`${NAMESPACE}__Description__c`]: description,
          [`${NAMESPACE}__Category__c`]: category || 'General',
        }
      );

      return { success: true, action: 'create' };
    } catch (e) {
      console.error('Failed to create skill:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to create skill' });
    }
  },

  update: async ({ locals, request }) => {
    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;

    if (!id || !name) {
      return fail(400, { error: 'ID and name are required' });
    }

    try {
      await updateSalesforce(
        locals.instanceUrl!,
        locals.accessToken!,
        `${NAMESPACE}__Skill__c`,
        id,
        {
          Name: name,
          [`${NAMESPACE}__Description__c`]: description,
          [`${NAMESPACE}__Category__c`]: category,
        }
      );

      return { success: true, action: 'update' };
    } catch (e) {
      console.error('Failed to update skill:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to update skill' });
    }
  },

  delete: async ({ locals, request }) => {
    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const id = formData.get('id') as string;

    if (!id) {
      return fail(400, { error: 'ID is required' });
    }

    try {
      await deleteSalesforce(
        locals.instanceUrl!,
        locals.accessToken!,
        `${NAMESPACE}__Skill__c`,
        id
      );

      return { success: true, action: 'delete' };
    } catch (e) {
      console.error('Failed to delete skill:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to delete skill' });
    }
  },
};

