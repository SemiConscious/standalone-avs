/**
 * Sound domain types
 * Platform-agnostic - no Salesforce or other platform knowledge
 */

// =============================================================================
// Sound Types
// =============================================================================

export type SoundType = 'greeting' | 'music' | 'prompt' | 'announcement' | 'voicemail';

export type SoundFormat = 'wav' | 'mp3' | 'ogg';

// =============================================================================
// Sound Entity
// =============================================================================

/**
 * Sound entity - represents an audio file for IVR, hold music, etc.
 */
export interface Sound {
  /** Unique identifier */
  id: string;
  /** External platform ID */
  platformId?: number;
  /** Sound name */
  name: string;
  /** Sound description */
  description: string;
  /** Sound type/category */
  type: SoundType;
  /** Audio format */
  format: SoundFormat;
  /** Duration in seconds */
  duration: number;
  /** File size in bytes */
  fileSize: number;
  /** URL to play/download the sound */
  url?: string;
  /** Creation date */
  createdDate: string;
  /** Last modified date */
  lastModifiedDate: string;
  /** Creator name */
  createdByName?: string;
  /** Whether this is a system sound (read-only) */
  isSystem: boolean;
}

// =============================================================================
// TTS Types
// =============================================================================

/**
 * Voice configuration for text-to-speech
 */
export interface TTSVoice {
  /** Voice identifier */
  id: string;
  /** Display name */
  name: string;
  /** Language code (e.g., 'en-GB') */
  languageCode: string;
  /** Gender */
  gender: 'male' | 'female' | 'neutral';
  /** Provider (e.g., 'aws', 'google') */
  provider: string;
}

/**
 * Text-to-speech request
 */
export interface TTSRequest {
  /** Text to convert */
  text: string;
  /** Voice to use */
  voiceId: string;
  /** Optional SSML formatting */
  ssml?: boolean;
}

// =============================================================================
// Input Types
// =============================================================================

/**
 * Input for creating a new sound
 */
export interface CreateSoundInput {
  name: string;
  description?: string;
  type?: SoundType;
  /** File data (base64 or File object for upload) */
  file?: File | string;
}

/**
 * Input for updating a sound
 */
export interface UpdateSoundInput {
  name?: string;
  description?: string;
  type?: SoundType;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format duration for display
 */
export function formatSoundDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get sound type display name
 */
export function getSoundTypeLabel(type: SoundType): string {
  switch (type) {
    case 'greeting':
      return 'Greeting';
    case 'music':
      return 'Hold Music';
    case 'prompt':
      return 'IVR Prompt';
    case 'announcement':
      return 'Announcement';
    case 'voicemail':
      return 'Voicemail';
    default:
      return type;
  }
}
