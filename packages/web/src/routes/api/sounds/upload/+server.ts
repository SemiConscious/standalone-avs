import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { 
  getSapienAccessToken, 
  getSapienHost, 
  getOrganizationId,
  canUseSapienApi 
} from '$lib/server/gatekeeper';

export const POST: RequestHandler = async ({ request, locals }) => {
  // Check authentication
  if (!canUseSapienApi(locals)) {
    throw error(401, 'Not authenticated');
  }

  try {
    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const tag = formData.get('tag') as string | null;
    const description = formData.get('description') as string | null;

    if (!file) {
      throw error(400, 'No file provided');
    }

    if (!tag || tag.trim() === '') {
      throw error(400, 'Tag/name is required');
    }

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/x-wav', 'audio/wave'];
    if (!allowedTypes.includes(file.type)) {
      throw error(400, `Unsupported audio format: ${file.type}. Please use MP3, WAV, or OGG files.`);
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw error(400, 'File size exceeds 10MB limit');
    }

    // Get Sapien access token
    const sapienToken = await getSapienAccessToken(locals.instanceUrl!, locals.accessToken!);
    const sapienHost = getSapienHost();
    const organizationId = getOrganizationId();

    if (!sapienHost) {
      throw error(503, 'Sapien API host not configured');
    }

    if (!organizationId) {
      throw error(503, 'Could not determine organization ID');
    }

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Upload to Sapien API
    // The Sapien API expects the audio data in the request body with metadata in headers
    const uploadUrl = `${sapienHost}/organisation/${organizationId}/sound`;
    
    console.log(`[Sound Upload] Uploading "${tag}" to ${uploadUrl}`);
    console.log(`[Sound Upload] File size: ${file.size} bytes, type: ${file.type}`);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sapienToken}`,
        'Content-Type': file.type || 'audio/wav',
        'X-Sound-Tag': tag.trim(),
        'X-Sound-Description': description?.trim() || '',
      },
      body: arrayBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Sound Upload] Sapien error:', response.status, errorText);
      throw error(response.status, `Failed to upload sound: ${errorText}`);
    }

    // Parse response
    let result;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      result = await response.json();
    } else {
      // Some APIs return the ID directly or no content
      const text = await response.text();
      result = text ? { id: text } : { id: 'unknown' };
    }

    console.log('[Sound Upload] Success:', result);

    return json({
      success: true,
      sound: {
        id: result.id || result.data?.id,
        tag: tag.trim(),
        description: description?.trim() || '',
        size: file.size,
        type: file.type,
      }
    });

  } catch (err) {
    console.error('[Sound Upload] Error:', err);
    if (err instanceof Response) {
      throw err;
    }
    throw error(500, err instanceof Error ? err.message : 'Failed to upload sound');
  }
};
