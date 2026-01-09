import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { 
  getSapienAccessToken, 
  getSapienHost, 
  getOrganizationId,
  canUseSapienApi 
} from '$lib/server/gatekeeper';

export const GET: RequestHandler = async ({ params, locals, url }) => {
  const { uuid } = params;
  const action = url.searchParams.get('action') || 'url'; // 'url' or 'stream'

  if (!uuid) {
    throw error(400, 'Recording UUID is required');
  }

  // Check authentication
  if (!canUseSapienApi(locals)) {
    throw error(401, 'Not authenticated');
  }

  try {
    // Get Sapien access token (this uses the API service account, same as avs-sfdx RestClient)
    const sapienToken = await getSapienAccessToken(locals.instanceUrl!, locals.accessToken!);
    const sapienHost = getSapienHost();
    const organizationId = getOrganizationId();

    if (!sapienHost) {
      throw error(503, 'Sapien API host not configured');
    }

    if (!organizationId) {
      throw error(503, 'Could not determine organization ID');
    }

    // Build the recording URL
    // Sapien recording endpoint format: /organisation/{orgId}/recording/{uuid}
    const recordingUrl = `${sapienHost}/organisation/${organizationId}/recording/${uuid}`;

    if (action === 'stream') {
      // Proxy the recording stream
      const response = await fetch(recordingUrl, {
        headers: {
          'Authorization': `Bearer ${sapienToken}`,
          'Accept': 'audio/*',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Sapien recording error:', response.status, errorText);
        throw error(response.status, `Failed to fetch recording: ${errorText}`);
      }

      // Get content type and return the audio stream
      const contentType = response.headers.get('content-type') || 'audio/mpeg';
      const contentLength = response.headers.get('content-length');
      const arrayBuffer = await response.arrayBuffer();

      return new Response(arrayBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Length': contentLength || String(arrayBuffer.byteLength),
          'Content-Disposition': `inline; filename="${uuid}.mp3"`,
          'Cache-Control': 'private, max-age=3600',
        },
      });
    } else {
      // Return a URL info object
      return json({
        uuid,
        streamUrl: `/api/recordings/${uuid}?action=stream`,
        downloadUrl: `/api/recordings/${uuid}?action=stream`,
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
      });
    }
  } catch (err) {
    console.error('Recording API error:', err);
    if (err instanceof Response) {
      throw err;
    }
    throw error(500, err instanceof Error ? err.message : 'Failed to access recording');
  }
};
