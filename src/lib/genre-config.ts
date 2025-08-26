import { Genre } from '@/types';

export interface GenreConfig {
  temperature: number;
  maxTokens: number;
  repeatPenalty?: number;
  topP?: number;
}

export const GENRE_CONFIGS: Record<Genre, GenreConfig> = {
  fantasy: {
    temperature: 0.8, // Higher creativity for magical elements
    maxTokens: 2500,
    repeatPenalty: 1.1,
    topP: 0.9,
  },
  mystery: {
    temperature: 0.6, // More controlled for logical plot progression
    maxTokens: 2200,
    repeatPenalty: 1.15,
    topP: 0.85,
  },
  'sci-fi': {
    temperature: 0.75, // Balanced creativity with technical consistency
    maxTokens: 2400,
    repeatPenalty: 1.1,
    topP: 0.9,
  },
  romance: {
    temperature: 0.7, // Moderate creativity for emotional scenes
    maxTokens: 2000,
    repeatPenalty: 1.05,
    topP: 0.9,
  },
  horror: {
    temperature: 0.85, // High creativity for suspense and atmosphere
    maxTokens: 2200,
    repeatPenalty: 1.2,
    topP: 0.9,
  },
  adventure: {
    temperature: 0.75, // Good balance for action and plot
    maxTokens: 2300,
    repeatPenalty: 1.1,
    topP: 0.9,
  },
};

export function getGenreConfig(genre: Genre): GenreConfig {
  return GENRE_CONFIGS[genre] || GENRE_CONFIGS.fantasy;
}
