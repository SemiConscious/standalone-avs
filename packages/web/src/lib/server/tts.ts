/**
 * Text-to-Speech (TTS) Service
 * 
 * This service handles interactions with the Sapien TTS API
 * for generating speech from text and managing sound files.
 */

import { env } from '$env/dynamic/private';

// TTS API Host from environment
const TTS_HOST = env.TTS_HOST || env.SAPIEN_HOST;

// ============================================================
// Types
// ============================================================

/**
 * Available TTS voice
 */
export interface TTSVoice {
  id: string;
  name: string;
  language: string;
  languageCode: string;
  gender: 'male' | 'female' | 'neutral';
  provider: 'aws' | 'google' | 'azure' | string;
  neural?: boolean;
  sampleRate?: number;
}

/**
 * TTS request parameters
 */
export interface TTSRequest {
  text: string;
  voiceId: string;
  language?: string;
  speed?: number; // 0.5 - 2.0
  pitch?: number; // -20 to +20
  format?: 'mp3' | 'wav' | 'ogg';
}

/**
 * TTS response with audio URL
 */
export interface TTSResponse {
  audioUrl: string;
  duration: number;
  format: string;
  expiresAt?: string;
}

/**
 * Sound file record
 */
export interface SoundFile {
  id: string;
  name: string;
  description?: string;
  type: 'tts' | 'upload' | 'system';
  audioUrl?: string;
  duration?: number;
  size?: number;
  format?: string;
  createdAt: string;
  updatedAt: string;
  organizationId: number;
  metadata?: {
    voiceId?: string;
    text?: string;
    language?: string;
  };
}

/**
 * Sound category
 */
export interface SoundCategory {
  id: string;
  name: string;
  description?: string;
  sounds: SoundFile[];
}

// ============================================================
// Voice Functions
// ============================================================

// Default TTS voices (these are typically configured in Salesforce Settings_v1__c)
const DEFAULT_VOICES: TTSVoice[] = [
  { id: 'en-GB-Neural2-A', name: 'British English (Female)', language: 'English (UK)', languageCode: 'en-GB', gender: 'female', provider: 'google', neural: true },
  { id: 'en-GB-Neural2-B', name: 'British English (Male)', language: 'English (UK)', languageCode: 'en-GB', gender: 'male', provider: 'google', neural: true },
  { id: 'en-US-Neural2-A', name: 'American English (Female)', language: 'English (US)', languageCode: 'en-US', gender: 'female', provider: 'google', neural: true },
  { id: 'en-US-Neural2-D', name: 'American English (Male)', language: 'English (US)', languageCode: 'en-US', gender: 'male', provider: 'google', neural: true },
  { id: 'de-DE-Neural2-A', name: 'German (Female)', language: 'German', languageCode: 'de-DE', gender: 'female', provider: 'google', neural: true },
  { id: 'de-DE-Neural2-B', name: 'German (Male)', language: 'German', languageCode: 'de-DE', gender: 'male', provider: 'google', neural: true },
  { id: 'fr-FR-Neural2-A', name: 'French (Female)', language: 'French', languageCode: 'fr-FR', gender: 'female', provider: 'google', neural: true },
  { id: 'fr-FR-Neural2-B', name: 'French (Male)', language: 'French', languageCode: 'fr-FR', gender: 'male', provider: 'google', neural: true },
  { id: 'es-ES-Neural2-A', name: 'Spanish (Female)', language: 'Spanish', languageCode: 'es-ES', gender: 'female', provider: 'google', neural: true },
  { id: 'es-ES-Neural2-B', name: 'Spanish (Male)', language: 'Spanish', languageCode: 'es-ES', gender: 'male', provider: 'google', neural: true },
];

/**
 * Get available TTS voices
 * 
 * Note: Voices are typically configured in Salesforce Settings_v1__c, not via Sapien API.
 * This function returns default voices. In a full implementation, these would be
 * fetched from Salesforce or a dedicated TTS service.
 * 
 * @param _sapienHost - Sapien API host URL (unused, kept for API compatibility)
 * @param _accessToken - Sapien access token (unused, kept for API compatibility)
 * @param _organizationId - Organization ID (unused, kept for API compatibility)
 * @returns Array of available voices
 */
export async function getVoices(
  _sapienHost: string,
  _accessToken: string,
  _organizationId: number
): Promise<TTSVoice[]> {
  console.log(`[TTS API] Returning default voices (voices are configured in Salesforce)`);
  return DEFAULT_VOICES;
}

/**
 * Get voices grouped by language
 * 
 * @param ttsHost - TTS API host URL
 * @param jwt - Authorization JWT
 * @param organizationId - Organization ID
 * @returns Voices grouped by language
 */
export async function getVoicesByLanguage(
  ttsHost: string,
  jwt: string,
  organizationId: number
): Promise<Record<string, TTSVoice[]>> {
  const voices = await getVoices(ttsHost, jwt, organizationId);
  
  return voices.reduce((acc, voice) => {
    const lang = voice.language || 'Unknown';
    if (!acc[lang]) {
      acc[lang] = [];
    }
    acc[lang].push(voice);
    return acc;
  }, {} as Record<string, TTSVoice[]>);
}

// ============================================================
// TTS Generation Functions
// ============================================================

/**
 * Generate speech from text
 * 
 * @param ttsHost - TTS API host URL
 * @param jwt - Authorization JWT
 * @param organizationId - Organization ID
 * @param request - TTS request parameters
 * @returns TTS response with audio URL
 */
export async function generateSpeech(
  ttsHost: string,
  jwt: string,
  organizationId: number,
  request: TTSRequest
): Promise<TTSResponse> {
  const url = `${ttsHost}/v1/tts/${organizationId}/synthesize`;

  console.log(`[TTS API] Generating speech for org ${organizationId}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[TTS API Error] ${response.status} - ${errorText}`);
    throw new Error(`Failed to generate speech: ${errorText}`);
  }

  return response.json();
}

/**
 * Preview TTS with a short sample
 * 
 * @param ttsHost - TTS API host URL
 * @param jwt - Authorization JWT
 * @param organizationId - Organization ID
 * @param voiceId - Voice ID
 * @param text - Optional preview text (uses default if not provided)
 * @returns TTS response with audio URL
 */
export async function previewVoice(
  ttsHost: string,
  jwt: string,
  organizationId: number,
  voiceId: string,
  text?: string
): Promise<TTSResponse> {
  const previewText = text || 'Hello, this is a sample of this voice. How does it sound?';
  
  return generateSpeech(ttsHost, jwt, organizationId, {
    text: previewText,
    voiceId,
    format: 'mp3',
  });
}

// ============================================================
// Sound File Functions
// ============================================================

/**
 * Get all sound files from Sapien API
 * 
 * Uses the Sapien endpoint: GET /organisation/{orgId}/sound
 * 
 * @param sapienHost - Sapien API host URL
 * @param accessToken - Sapien access token
 * @param organizationId - Organization ID
 * @returns Array of sound files
 */
export async function getSoundFiles(
  sapienHost: string,
  accessToken: string,
  organizationId: number
): Promise<SoundFile[]> {
  // Use Sapien API endpoint (same as avs-sfdx RestClient)
  const url = `${sapienHost}/organisation/${organizationId}/sound`;

  console.log(`[Sapien Sound API] Fetching sound files for org ${organizationId}`);
  console.log(`[Sapien Sound API] URL: ${url}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Sapien Sound API Error] ${response.status} - ${errorText}`);
    throw new Error(`Failed to fetch sound files: ${errorText}`);
  }

  const data = await response.json();
  
  // Transform Sapien response to our SoundFile format
  // Sapien returns: { data: [...] } or just [...]
  const sounds = Array.isArray(data) ? data : (data.data || []);
  
  console.log(`[Sapien Sound API] Fetched ${sounds.length} sound files`);
  
  return sounds.map((s: Record<string, unknown>) => ({
    id: String(s.id || ''),
    name: String(s.tag || s.name || ''),
    description: String(s.description || ''),
    type: 'upload' as const, // Sapien sounds are uploaded files
    duration: Number(s.duration || 0),
    size: Number(s.size || 0),
    format: 'wav',
    createdAt: String(s.created || new Date().toISOString()),
    updatedAt: String(s.modified || new Date().toISOString()),
    organizationId,
  }));
}

/**
 * Get a specific sound file (audio data) from Sapien API
 * 
 * Uses the Sapien endpoint: GET /organisation/{orgId}/sound/{id}
 * This returns the actual audio binary data.
 * 
 * @param sapienHost - Sapien API host URL
 * @param accessToken - Sapien access token
 * @param organizationId - Organization ID
 * @param soundId - Sound file ID
 * @returns Sound file audio response
 */
export async function getSoundFile(
  sapienHost: string,
  accessToken: string,
  organizationId: number,
  soundId: string
): Promise<Response> {
  const url = `${sapienHost}/organisation/${organizationId}/sound/${soundId}`;

  console.log(`[Sapien Sound API] Fetching sound file ${soundId}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'audio/*',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Sapien Sound API Error] ${response.status} - ${errorText}`);
    throw new Error(`Failed to fetch sound file: ${errorText}`);
  }

  return response;
}

/**
 * Create a new sound file via Sapien API
 * 
 * Note: TTS synthesis is typically done via a separate TTS service.
 * This function creates a sound file placeholder. For actual TTS,
 * you would need to:
 * 1. Call a TTS service to generate audio
 * 2. Upload the audio via uploadSoundFile
 * 
 * Uses the Sapien endpoint: POST /organisation/{orgId}/sound
 * 
 * @param sapienHost - Sapien API host URL
 * @param accessToken - Sapien access token
 * @param organizationId - Organization ID
 * @param name - Sound file name (tag)
 * @param text - Text to synthesize (stored as description for now)
 * @param voiceId - Voice ID (stored in description for now)
 * @param description - Optional description
 * @returns Created sound file
 */
export async function createTTSSound(
  sapienHost: string,
  accessToken: string,
  organizationId: number,
  name: string,
  text: string,
  voiceId: string,
  description?: string
): Promise<SoundFile> {
  // Note: Sapien's sound API expects audio data, not TTS parameters
  // For now, we'll throw an error indicating TTS creation is not supported
  // In a full implementation, you would:
  // 1. Call a TTS service (Google Cloud TTS, AWS Polly, etc.)
  // 2. Get the audio data
  // 3. Upload it via uploadSoundFile
  
  console.log(`[Sapien Sound API] TTS creation requested for "${name}" with voice ${voiceId}`);
  console.log(`[Sapien Sound API] Text: ${text.substring(0, 100)}...`);
  
  throw new Error(
    'TTS sound creation is not yet implemented. ' +
    'Please upload an audio file directly instead. ' +
    'TTS synthesis requires integration with a text-to-speech service.'
  );
}

/**
 * Upload a sound file to Sapien API
 * 
 * Uses the Sapien endpoint: POST /organisation/{orgId}/sound
 * The audio data is sent as base64-encoded body with custom headers.
 * 
 * @param sapienHost - Sapien API host URL
 * @param accessToken - Sapien access token
 * @param organizationId - Organization ID
 * @param name - Sound file name (tag)
 * @param file - Audio file data
 * @param description - Optional description
 * @returns Created sound file
 */
export async function uploadSoundFile(
  sapienHost: string,
  accessToken: string,
  organizationId: number,
  name: string,
  file: File | Blob,
  description?: string
): Promise<SoundFile> {
  const url = `${sapienHost}/organisation/${organizationId}/sound`;

  console.log(`[Sapien Sound API] Uploading sound file "${name}"`);

  // Convert file to ArrayBuffer then to base64
  const arrayBuffer = await file.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString('base64');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'audio/wav',
      'X-Sound-Tag': name,
      'X-Sound-Description': description || '',
    },
    body: base64Data,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Sapien Sound API Error] ${response.status} - ${errorText}`);
    throw new Error(`Failed to upload sound file: ${errorText}`);
  }

  const data = await response.json();
  const soundId = data.id || data.data?.id;

  return {
    id: String(soundId),
    name,
    description,
    type: 'upload',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    organizationId,
  };
}

/**
 * Update a sound file via Sapien API
 * 
 * Uses the Sapien endpoint: PUT /organisation/{orgId}/sound/{id}
 * Note: Sapien requires the full audio data for updates.
 * 
 * @param sapienHost - Sapien API host URL
 * @param accessToken - Sapien access token
 * @param organizationId - Organization ID
 * @param soundId - Sound file ID
 * @param updates - Fields to update (name/description only without audio)
 * @param audioData - Optional new audio data
 * @returns Updated sound file
 */
export async function updateSoundFile(
  sapienHost: string,
  accessToken: string,
  organizationId: number,
  soundId: string,
  updates: Partial<Pick<SoundFile, 'name' | 'description'>>,
  audioData?: ArrayBuffer
): Promise<SoundFile> {
  const url = `${sapienHost}/organisation/${organizationId}/sound/${soundId}`;

  console.log(`[Sapien Sound API] Updating sound file ${soundId}`);

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
  };

  if (updates.name) {
    headers['X-Sound-Tag'] = updates.name;
  }
  if (updates.description) {
    headers['X-Sound-Description'] = updates.description;
  }

  let body: string | undefined;
  if (audioData) {
    body = Buffer.from(audioData).toString('base64');
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers,
    body,
  });

  if (!response.ok && response.status !== 204) {
    const errorText = await response.text();
    console.error(`[Sapien Sound API Error] ${response.status} - ${errorText}`);
    throw new Error(`Failed to update sound file: ${errorText}`);
  }

  return {
    id: soundId,
    name: updates.name || '',
    description: updates.description,
    type: 'upload',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    organizationId,
  };
}

/**
 * Delete a sound file from Sapien API
 * 
 * Uses the Sapien endpoint: DELETE /organisation/{orgId}/sound/{id}
 * 
 * @param sapienHost - Sapien API host URL
 * @param accessToken - Sapien access token
 * @param organizationId - Organization ID
 * @param soundId - Sound file ID
 */
export async function deleteSoundFile(
  sapienHost: string,
  accessToken: string,
  organizationId: number,
  soundId: string
): Promise<void> {
  const url = `${sapienHost}/organisation/${organizationId}/sound/${soundId}`;

  console.log(`[Sapien Sound API] Deleting sound file ${soundId}`);

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  // 204 No Content or 200 OK are both success
  if (!response.ok && response.status !== 204) {
    const errorText = await response.text();
    console.error(`[Sapien Sound API Error] ${response.status} - ${errorText}`);
    throw new Error(`Failed to delete sound file: ${errorText}`);
  }
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get TTS API host from environment
 */
export function getTTSHost(): string | undefined {
  return TTS_HOST;
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Get supported audio formats
 */
export function getSupportedFormats(): string[] {
  return ['mp3', 'wav', 'ogg'];
}

/**
 * Validate audio file for upload
 */
export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'];
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 10MB limit' };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Unsupported audio format. Please use MP3, WAV, or OGG' };
  }
  
  return { valid: true };
}

