"use client";

import { useState } from 'react';
import {
  AspectRatio,
  Resolution,
  VideoGeneration,
  ASPECT_RATIO_LABELS,
  RESOLUTION_LABELS,
  DEFAULT_ASPECT_RATIO,
  DEFAULT_RESOLUTION
} from '../types/video';
import { v4 as uuidv4 } from 'uuid';

interface VideoInputFormProps {
  onGenerationStart: (generation: VideoGeneration) => void;
  onGenerationComplete: () => void;
  disabled?: boolean;
}

export default function VideoInputForm({ onGenerationStart, onGenerationComplete, disabled }: VideoInputFormProps) {
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState<Resolution>(DEFAULT_RESOLUTION);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(DEFAULT_ASPECT_RATIO);
  const [duration, setDuration] = useState('5s');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let pollInterval: NodeJS.Timeout | null = null;
    let pollTimeout: NodeJS.Timeout | null = null;

    // Create initial generation object with temporary ID
    const initialGeneration: VideoGeneration = {
      id: uuidv4(), // Temporary ID
      prompt,
      status: 'pending',
      aspectRatio,
      resolution,
      duration
    };

    try {
      const apiKey = localStorage.getItem('lumaai-api-key');
      if (!apiKey) {
        setError('Please set your API key in settings first');
        return;
      }

      // Start the generation
      const response = await fetch('/api/generateVideo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          prompt,
          aspectRatio,
          resolution,
          length: duration,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate video');
      }

      // Create generation object with the API ID
      const generation: VideoGeneration = {
        id: data.id,
        prompt,
        status: 'pending',
        aspectRatio: data.aspectRatio || aspectRatio,
        resolution: data.resolution || resolution,
        duration: data.duration || duration
      };

      // Add the pending generation to the grid
      onGenerationStart(generation);

      // Start polling for the video status
      pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/generateVideo?offset=0`, {
            headers: {
              'x-api-key': apiKey,
            },
          });
          
          if (!statusResponse.ok) {
            throw new Error('Failed to check video status');
          }
          
          const statusData = await statusResponse.json();
          const latestGeneration = statusData.generations.find((g: any) => g.id === data.id);
          
          if (latestGeneration) {
            if (latestGeneration.status === 'completed') {
              if (pollInterval) clearInterval(pollInterval);
              if (pollTimeout) clearTimeout(pollTimeout);
              onGenerationStart({
                ...generation,
                status: 'completed',
                url: latestGeneration.url,
                thumbnailUrl: latestGeneration.thumbnailUrl,
                aspectRatio: latestGeneration.aspectRatio || generation.aspectRatio,
                resolution: latestGeneration.resolution || generation.resolution,
                duration: latestGeneration.duration || generation.duration
              });
            } else if (latestGeneration.status === 'failed') {
              if (pollInterval) clearInterval(pollInterval);
              if (pollTimeout) clearTimeout(pollTimeout);
              throw new Error(latestGeneration.error || 'Generation failed');
            }
          }
        } catch (pollError) {
          if (pollInterval) clearInterval(pollInterval);
          if (pollTimeout) clearTimeout(pollTimeout);
          throw pollError;
        }
      }, 5000); // Poll every 5 seconds

      // Set a timeout to stop polling after 5 minutes
      pollTimeout = setTimeout(() => {
        if (pollInterval) {
          clearInterval(pollInterval);
          onGenerationStart({
            ...generation,
            status: 'failed',
            error: 'Generation timed out after 5 minutes'
          });
        }
      }, 5 * 60 * 1000); // 5 minutes
    } catch (err) {
      // Update the generation with failed status
      onGenerationStart({
        ...initialGeneration,
        status: 'failed',
        error: err instanceof Error ? err.message : 'An error occurred'
      });
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
              value={resolution}
              onChange={(e) => setResolution(e.target.value as Resolution)}
              className="bg-transparent text-gray-400 outline-none appearance-none cursor-pointer disabled:cursor-not-allowed"
              disabled={disabled}
            >
              {Object.entries(RESOLUTION_LABELS).map(([value]) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <div className="text-gray-400">·</div>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
              className="bg-transparent text-gray-400 outline-none appearance-none cursor-pointer disabled:cursor-not-allowed"
              disabled={disabled}
            >
              {Object.entries(ASPECT_RATIO_LABELS).map(([value]) => (
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
