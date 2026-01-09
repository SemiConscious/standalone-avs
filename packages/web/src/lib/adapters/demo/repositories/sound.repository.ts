/**
 * Demo Sound Repository Implementation
 */

import type { ISoundRepository, SoundQueryParams } from '$lib/repositories';
import type {
  Sound,
  CreateSoundInput,
  UpdateSoundInput,
  TTSVoice,
  TTSRequest,
  PaginatedResult,
  MutationResult,
  DeleteResult,
} from '$lib/domain';
import { createPaginationMeta } from '$lib/domain';
import { DEMO_SOUNDS, DEMO_TTS_VOICES } from '../data/sounds';

export class DemoSoundRepository implements ISoundRepository {
  private sounds: Sound[] = [...DEMO_SOUNDS];
  private nextId = 100;

  async findAll(params: SoundQueryParams): Promise<PaginatedResult<Sound>> {
    let filtered = [...this.sounds];

    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(searchLower) ||
        s.description.toLowerCase().includes(searchLower)
      );
    }

    if (params.filters?.type) {
      filtered = filtered.filter(s => s.type === params.filters!.type);
    }
    if (params.filters?.systemOnly) {
      filtered = filtered.filter(s => s.isSystem);
    }
    if (params.filters?.userOnly) {
      filtered = filtered.filter(s => !s.isSystem);
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

  async findById(id: string): Promise<Sound | null> {
    return this.sounds.find(s => s.id === id) || null;
  }

  async findByName(name: string): Promise<Sound | null> {
    return this.sounds.find(s => s.name === name) || null;
  }

  async create(data: CreateSoundInput): Promise<MutationResult<Sound>> {
    const id = `demo-snd${String(this.nextId++).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const sound: Sound = {
      id,
      platformId: this.nextId,
      name: data.name,
      description: data.description || '',
      type: data.type || 'prompt',
      format: 'wav',
      duration: 0,
      fileSize: 0,
      createdDate: now,
      lastModifiedDate: now,
      createdByName: 'Demo User',
      isSystem: false,
    };

    this.sounds.push(sound);
    return { success: true, data: sound };
  }

  async update(id: string, data: UpdateSoundInput): Promise<MutationResult<Sound>> {
    const index = this.sounds.findIndex(s => s.id === id);
    if (index === -1) return { success: false, error: 'Sound not found' };

    const sound = this.sounds[index];
    if (data.name !== undefined) sound.name = data.name;
    if (data.description !== undefined) sound.description = data.description;
    if (data.type !== undefined) sound.type = data.type;
    sound.lastModifiedDate = new Date().toISOString();

    return { success: true, data: sound };
  }

  async delete(id: string): Promise<DeleteResult> {
    const index = this.sounds.findIndex(s => s.id === id);
    if (index === -1) return { success: false, error: 'Sound not found' };

    const sound = this.sounds[index];
    if (sound.isSystem) {
      return { success: false, error: 'Cannot delete system sounds' };
    }

    this.sounds.splice(index, 1);
    return { success: true };
  }

  async getPlaybackUrl(id: string): Promise<string | null> {
    const sound = await this.findById(id);
    return sound ? `/api/sounds/${sound.platformId}` : null;
  }

  async getDownloadUrl(id: string): Promise<string | null> {
    return this.getPlaybackUrl(id);
  }

  async getTTSVoices(): Promise<TTSVoice[]> {
    return [...DEMO_TTS_VOICES];
  }

  async generateTTS(request: TTSRequest): Promise<string> {
    // In demo mode, return a placeholder URL
    return `/api/tts/demo?text=${encodeURIComponent(request.text)}&voice=${request.voiceId}`;
  }

  async createFromTTS(name: string, request: TTSRequest): Promise<MutationResult<Sound>> {
    return this.create({ name, type: 'prompt', description: `Generated from TTS: "${request.text.substring(0, 50)}..."` });
  }
}
