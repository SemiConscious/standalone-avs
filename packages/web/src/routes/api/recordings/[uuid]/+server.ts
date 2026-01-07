import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { 
  getSapienJwt, 
  getSapienConfig, 
  canGetSapienJwt,
  SAPIEN_SCOPES 
} from '$lib/server/sapien';

export const GET: RequestHandler = async ({ params, locals, url }) => {
  const { uuid } = params;
  const action = url.searchParams.get('action') || 'url'; // 'url' or 'stream'

  if (!uuid) {
    throw error(400, 'Recording UUID is required');
  }

  // Check authentication
  if (!locals.accessToken || !locals.instanceUrl) {
    throw error(401, 'Not authenticated');
  }

  // Check Sapien host is configured
  const sapienHost = env.SAPIEN_HOST;
  if (!sapienHost) {
    throw error(503, 'Sapien API not configured. Set SAPIEN_HOST environment variable.');
  }

  if (!canGetSapienJwt(locals)) {
    throw error(401, 'Cannot access Sapien API - invalid session');
  }

  try {
    // Get Sapien JWT - this also caches the organization ID
    const jwt = await getSapienJwt(
      locals.instanceUrl,
      locals.accessToken,
      SAPIEN_SCOPES.ENDUSER_BASIC
    );

    // Get org ID from cached JWT
    const sapienConfig = getSapienConfig();
    if (!sapienConfig.organizationId) {
      throw error(503, 'Could not determine organization ID from Sapien JWT');
    }

    // Build the recording URL
    // Sapien recording endpoint format: /organisation/{orgId}/recording/{uuid}
    const recordingUrl = `${sapienHost}/organisation/${sapienConfig.organizationId}/recording/${uuid}`;

    if (action === 'stream') {
      // Proxy the recording stream
      const response = await fetch(recordingUrl, {
        headers: {
          'Authorization': `Bearer ${jwt}`,
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
