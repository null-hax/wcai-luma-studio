"use client";

import { useState } from 'react';
import { AspectRatio, VideoGeneration, ASPECT_RATIO_LABELS, DEFAULT_ASPECT_RATIO } from '../types/video';
import { v4 as uuidv4 } from 'uuid';

interface VideoInputFormProps {
  onGenerationStart: (generation: VideoGeneration) => void;
  onGenerationComplete: () => void;
  disabled?: boolean;
}

export default function VideoInputForm({ onGenerationStart, onGenerationComplete, disabled }: VideoInputFormProps) {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(DEFAULT_ASPECT_RATIO);
  const [duration, setDuration] = useState('5s');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const generationId = uuidv4();
    const generation: VideoGeneration = {
      id: generationId,
      prompt,
      status: 'pending',
      aspectRatio,
      duration
    };

    try {
      const apiKey = localStorage.getItem('lumaai-api-key');
      if (!apiKey) {
        setError('Please set your API key in settings first');
        return;
      }

      // Add the initial pending generation to the grid
      onGenerationStart(generation);

      const response = await fetch('/api/generateVideo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          prompt,
          aspectRatio,
          length: duration,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate video');
      }

      // Update the generation with completed status and thumbnail
      generation.status = 'completed';
      generation.url = data.url;
      generation.thumbnailUrl = data.thumbnailUrl;
      onGenerationStart(generation);
    } catch (err) {
      // Update the generation with failed status
      generation.status = 'failed';
      generation.error = err instanceof Error ? err.message : 'An error occurred';
      onGenerationStart(generation);
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error generating video:', err);
    } finally {
      onGenerationComplete();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-center gap-2 p-2 bg-slate-900 rounded-2xl">
        <div className="flex-1 flex items-center gap-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none resize-none pl-4 min-h-[24px] pt-6"
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = target.scrollHeight + 'px';
            }}
            placeholder="What do you want to see..."
            disabled={disabled}
          />
          <div className="flex items-center gap-2">
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
              className="bg-transparent text-gray-400 outline-none appearance-none cursor-pointer disabled:cursor-not-allowed"
              disabled={disabled}
            >
              {Object.entries(ASPECT_RATIO_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <div className="text-gray-400">·</div>
            <button
              type="button"
              onClick={() => setDuration(duration === '5s' ? '9s' : '5s')}
              className="text-gray-400 hover:text-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={disabled}
            >
              {duration}
            </button>
          </div>
          <button
            type="submit"
            disabled={disabled || !prompt.trim()}
            className="p-2 rounded-full hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-400">
              <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
            </svg>
          </button>
        </div>
      </div>
      
      {error && (
        <div className="absolute left-0 -bottom-6 text-red-500 text-sm">
          {error}
        </div>
      )}
    </form>
  );
}
