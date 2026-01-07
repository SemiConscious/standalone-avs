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

/**
 * Get available TTS voices
 * 
 * @param ttsHost - TTS API host URL
 * @param jwt - Authorization JWT
 * @param organizationId - Organization ID
 * @returns Array of available voices
 */
export async function getVoices(
  ttsHost: string,
  jwt: string,
  organizationId: number
): Promise<TTSVoice[]> {
  const url = `${ttsHost}/v1/tts/${organizationId}/voices`;

  console.log(`[TTS API] Fetching voices for org ${organizationId}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[TTS API Error] ${response.status} - ${errorText}`);
    throw new Error(`Failed to fetch voices: ${errorText}`);
  }

  const data = await response.json();
  console.log(`[TTS API] Fetched ${data.length} voices`);
  return data;
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
 * Get all sound files
 * 
 * @param ttsHost - TTS API host URL
 * @param jwt - Authorization JWT
 * @param organizationId - Organization ID
 * @returns Array of sound files
 */
export async function getSoundFiles(
  ttsHost: string,
  jwt: string,
  organizationId: number
): Promise<SoundFile[]> {
  const url = `${ttsHost}/v1/sounds/${organizationId}`;

  console.log(`[TTS API] Fetching sound files for org ${organizationId}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[TTS API Error] ${response.status} - ${errorText}`);
    throw new Error(`Failed to fetch sound files: ${errorText}`);
  }

  const data = await response.json();
  console.log(`[TTS API] Fetched ${data.length} sound files`);
  return data;
}

/**
 * Get a specific sound file
 * 
 * @param ttsHost - TTS API host URL
 * @param jwt - Authorization JWT
 * @param organizationId - Organization ID
 * @param soundId - Sound file ID
 * @returns Sound file details
 */
export async function getSoundFile(
  ttsHost: string,
  jwt: string,
  organizationId: number,
  soundId: string
): Promise<SoundFile> {
  const url = `${ttsHost}/v1/sounds/${organizationId}/${soundId}`;

  console.log(`[TTS API] Fetching sound file ${soundId}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[TTS API Error] ${response.status} - ${errorText}`);
    throw new Error(`Failed to fetch sound file: ${errorText}`);
  }

  return response.json();
}

/**
 * Create a new TTS sound file
 * 
 * @param ttsHost - TTS API host URL
 * @param jwt - Authorization JWT
 * @param organizationId - Organization ID
 * @param name - Sound file name
 * @param text - Text to synthesize
 * @param voiceId - Voice ID
 * @param description - Optional description
 * @returns Created sound file
 */
export async function createTTSSound(
  ttsHost: string,
  jwt: string,
  organizationId: number,
  name: string,
  text: string,
  voiceId: string,
  description?: string
): Promise<SoundFile> {
  const url = `${ttsHost}/v1/sounds/${organizationId}`;

  console.log(`[TTS API] Creating TTS sound "${name}"`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      description,
      type: 'tts',
      metadata: {
        text,
        voiceId,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[TTS API Error] ${response.status} - ${errorText}`);
    throw new Error(`Failed to create sound file: ${errorText}`);
  }

  return response.json();
}

/**
 * Upload a sound file
 * 
 * @param ttsHost - TTS API host URL
 * @param jwt - Authorization JWT
 * @param organizationId - Organization ID
 * @param name - Sound file name
 * @param file - Audio file data (base64 or FormData)
 * @param description - Optional description
 * @returns Created sound file
 */
export async function uploadSoundFile(
  ttsHost: string,
  jwt: string,
  organizationId: number,
  name: string,
  file: File | Blob,
  description?: string
): Promise<SoundFile> {
  const url = `${ttsHost}/v1/sounds/${organizationId}/upload`;

  console.log(`[TTS API] Uploading sound file "${name}"`);

  const formData = new FormData();
  formData.append('name', name);
  formData.append('file', file);
  if (description) {
    formData.append('description', description);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[TTS API Error] ${response.status} - ${errorText}`);
    throw new Error(`Failed to upload sound file: ${errorText}`);
  }

  return response.json();
}

/**
 * Update a sound file
 * 
 * @param ttsHost - TTS API host URL
 * @param jwt - Authorization JWT
 * @param organizationId - Organization ID
 * @param soundId - Sound file ID
 * @param updates - Fields to update
 * @returns Updated sound file
 */
export async function updateSoundFile(
  ttsHost: string,
  jwt: string,
  organizationId: number,
  soundId: string,
  updates: Partial<Pick<SoundFile, 'name' | 'description'>>
): Promise<SoundFile> {
  const url = `${ttsHost}/v1/sounds/${organizationId}/${soundId}`;

  console.log(`[TTS API] Updating sound file ${soundId}`);

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[TTS API Error] ${response.status} - ${errorText}`);
    throw new Error(`Failed to update sound file: ${errorText}`);
  }

  return response.json();
}

/**
 * Delete a sound file
 * 
 * @param ttsHost - TTS API host URL
 * @param jwt - Authorization JWT
 * @param organizationId - Organization ID
 * @param soundId - Sound file ID
 */
export async function deleteSoundFile(
  ttsHost: string,
  jwt: string,
  organizationId: number,
  soundId: string
): Promise<void> {
  const url = `${ttsHost}/v1/sounds/${organizationId}/${soundId}`;

  console.log(`[TTS API] Deleting sound file ${soundId}`);

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[TTS API Error] ${response.status} - ${errorText}`);
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

