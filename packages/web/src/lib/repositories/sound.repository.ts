/**
 * Sound Repository Interface
 * Defines the contract for sound/audio data access
 */

import type {
  Sound,
  CreateSoundInput,
  UpdateSoundInput,
  SoundType,
  TTSVoice,
  TTSRequest,
  QueryParams,
  PaginatedResult,
  MutationResult,
  DeleteResult,
} from '$lib/domain';
import type { RepositoryOptions } from './types';

// =============================================================================
// Sound Query Parameters
// =============================================================================

/**
 * Extended query parameters for sound queries
 */
export interface SoundQueryParams extends QueryParams {
  filters?: {
    /** Filter by sound type */
    type?: SoundType;
    /** Filter by system sounds only */
    systemOnly?: boolean;
    /** Filter by user-created sounds only */
    userOnly?: boolean;
  };
}

// =============================================================================
// Sound Repository Interface
// =============================================================================

/**
 * Sound Repository Interface
 * Provides data access operations for Sound entities
 */
export interface ISoundRepository {
  // =========================================================================
  // Basic CRUD Operations
  // =========================================================================

  /**
   * Find all sounds matching the query parameters
   */
  findAll(params: SoundQueryParams, options?: RepositoryOptions): Promise<PaginatedResult<Sound>>;

  /**
   * Find a single sound by ID
   */
  findById(id: string, options?: RepositoryOptions): Promise<Sound | null>;

  /**
   * Find a sound by name
   */
  findByName(name: string, options?: RepositoryOptions): Promise<Sound | null>;

  /**
   * Create a new sound (upload)
   */
  create(data: CreateSoundInput): Promise<MutationResult<Sound>>;

  /**
   * Update sound metadata
   */
  update(id: string, data: UpdateSoundInput): Promise<MutationResult<Sound>>;

  /**
   * Delete a sound
   */
  delete(id: string): Promise<DeleteResult>;

  // =========================================================================
  // Playback Operations
  // =========================================================================

  /**
   * Get playback URL for a sound
   */
  getPlaybackUrl(id: string): Promise<string | null>;

  /**
   * Get download URL for a sound
   */
  getDownloadUrl(id: string): Promise<string | null>;

  // =========================================================================
  // Text-to-Speech Operations
  // =========================================================================

  /**
   * Get available TTS voices
   */
  getTTSVoices(): Promise<TTSVoice[]>;

  /**
   * Generate speech from text
   * @returns URL to the generated audio
   */
  generateTTS(request: TTSRequest): Promise<string>;

  /**
   * Create a sound from TTS
   */
  createFromTTS(name: string, request: TTSRequest): Promise<MutationResult<Sound>>;
}
