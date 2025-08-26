'use client';

import { useState } from 'react';
import { Wand2, Users, BookOpen } from 'lucide-react';
import { GENRES, Genre, StoryRequest } from '@/types';

interface StoryFormProps {
  onSubmit: (request: StoryRequest) => void;
  isLoading: boolean;
}

export default function StoryForm({ onSubmit, isLoading }: StoryFormProps) {
  const [genre, setGenre] = useState<Genre>('fantasy');
  const [characters, setCharacters] = useState(2);
  const [characterNames, setCharacterNames] = useState<string[]>(['']);
  const [paragraphs, setParagraphs] = useState(5);
  const [useCharacterNames, setUseCharacterNames] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const request: StoryRequest = {
      genre,
      characters,
      paragraphs,
      ...(useCharacterNames &&
        characterNames.some(name => name.trim()) && {
          characterNames: characterNames.filter(name => name.trim()),
        }),
    };

    onSubmit(request);
  };

  const updateCharacterName = (index: number, name: string) => {
    const newNames = [...characterNames];
    newNames[index] = name;
    setCharacterNames(newNames);
  };

  const addCharacterName = () => {
    setCharacterNames([...characterNames, '']);
  };

  const removeCharacterName = (index: number) => {
    const newNames = characterNames.filter((_, i) => i !== index);
    setCharacterNames(newNames);
  };

  return (
    <div className='w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6'>
      <div className='flex items-center gap-3 mb-6'>
        <Wand2 className='h-6 w-6 text-purple-600' />
        <h2 className='text-2xl font-bold text-black'>Create Your Story</h2>
      </div>

      <form onSubmit={handleSubmit} className='space-y-6'>
        {/* Genre Selection */}
        <div>
          <label className='block text-sm font-medium text-black mb-2'>
            Genre
          </label>
          <select
            value={genre}
            onChange={e => setGenre(e.target.value as Genre)}
            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent'
            disabled={isLoading}
          >
            {GENRES.map(genreOption => (
              <option key={genreOption.value} value={genreOption.value}>
                {genreOption.label}
              </option>
            ))}
          </select>
        </div>

        {/* Character Count */}
        <div>
          <label className='block text-sm font-medium text-black mb-2'>
            <Users className='inline h-4 w-4 mr-1' />
            Number of Characters: {characters}
          </label>
          <input
            type='range'
            min='1'
            max='6'
            value={characters}
            onChange={e => setCharacters(parseInt(e.target.value))}
            className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider'
            disabled={isLoading}
          />
          <div className='flex justify-between text-xs text-black mt-1'>
            <span>1</span>
            <span>6</span>
          </div>
        </div>

        {/* Character Names Toggle */}
        <div>
          <label className='flex items-center'>
            <input
              type='checkbox'
              checked={useCharacterNames}
              onChange={e => setUseCharacterNames(e.target.checked)}
              className='rounded border-gray-300 text-purple-600 shadow-sm focus:border-purple-300 focus:ring focus:ring-purple-200 focus:ring-opacity-50'
              disabled={isLoading}
            />
            <span className='ml-2 text-sm text-black'>
              Specify character names
            </span>
          </label>
        </div>

        {/* Character Names */}
        {useCharacterNames && (
          <div className='space-y-2'>
            <label className='block text-sm font-medium text-black'>
              Character Names
            </label>
            {characterNames.map((name, index) => (
              <div key={index} className='flex gap-2'>
                <input
                  type='text'
                  value={name}
                  onChange={e => updateCharacterName(index, e.target.value)}
                  placeholder={`Character ${index + 1} name`}
                  className='flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent'
                  disabled={isLoading}
                />
                {characterNames.length > 1 && (
                  <button
                    type='button'
                    onClick={() => removeCharacterName(index)}
                    className='px-3 py-2 text-red-600 hover:text-red-800'
                    disabled={isLoading}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            {characterNames.length < characters && (
              <button
                type='button'
                onClick={addCharacterName}
                className='text-sm text-purple-600 hover:text-purple-800'
                disabled={isLoading}
              >
                + Add another name
              </button>
            )}
          </div>
        )}

        {/* Paragraph Count */}
        <div>
          <label className='block text-sm font-medium text-black mb-2'>
            <BookOpen className='inline h-4 w-4 mr-1' />
            Number of Paragraphs: {paragraphs}
          </label>
          <input
            type='range'
            min='3'
            max='10'
            value={paragraphs}
            onChange={e => setParagraphs(parseInt(e.target.value))}
            className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider'
            disabled={isLoading}
          />
          <div className='flex justify-between text-xs text-black mt-1'>
            <span>3</span>
            <span>10</span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type='submit'
          disabled={isLoading}
          className='w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-medium py-3 px-4 rounded-md transition duration-200 flex items-center justify-center gap-2'
        >
          {isLoading ? (
            <>
              <div className='animate-spin rounded-full h-4 w-4 border-2 border-white border-top-transparent'></div>
              Generating Story...
            </>
          ) : (
            <>
              <Wand2 className='h-4 w-4' />
              Generate Story
            </>
          )}
        </button>
      </form>
    </div>
  );
}
