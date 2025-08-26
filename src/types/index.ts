export interface StoryRequest {
  genre: string;
  characters: number;
  characterNames?: string[];
  paragraphs: number;
}

export interface Paragraph {
  id: number;
  text: string;
  imagePrompt: string;
  imageUrl?: string;
}

export interface Story {
  id: string;
  preface: string;
  paragraphs: Paragraph[];
  genre: string;
  characters: number;
  createdAt: Date;
}

export interface StoryResponse {
  storyId: string;
  preface: string;
  paragraphs: Paragraph[];
}

export type Genre =
  | 'fantasy'
  | 'mystery'
  | 'sci-fi'
  | 'romance'
  | 'horror'
  | 'adventure';

export function isValidGenre(genre: string): genre is Genre {
  return [
    'fantasy',
    'mystery',
    'sci-fi',
    'romance',
    'horror',
    'adventure',
  ].includes(genre);
}

export const GENRES: { value: Genre; label: string }[] = [
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'mystery', label: 'Mystery' },
  { value: 'sci-fi', label: 'Sci-Fi' },
  { value: 'romance', label: 'Romance' },
  { value: 'horror', label: 'Horror' },
  { value: 'adventure', label: 'Adventure' },
];
