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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm text-gray-400">Prompt:</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full p-3 bg-gray-900 text-white rounded-lg border border-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none"
          rows={3}
          placeholder="Enter your prompt..."
          disabled={disabled}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm text-gray-400">Aspect Ratio:</label>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
            className="w-full p-3 bg-gray-900 text-white rounded-lg border border-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none appearance-none"
            disabled={disabled}
          >
            {Object.entries(ASPECT_RATIO_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm text-gray-400">Duration:</label>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full p-3 bg-gray-900 text-white rounded-lg border border-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none appearance-none"
            disabled={disabled}
          >
            <option value="5s">5 seconds</option>
            <option value="9s">9 seconds</option>
          </select>
        </div>
      </div>
      
      {error && (
        <div className="text-red-500 text-sm mt-2">
          {error}
        </div>
      )}
      
      <button
        type="submit"
        disabled={disabled || !prompt.trim()}
        className={`w-full py-3 px-4 ${
          disabled || !prompt.trim()
            ? 'bg-gray-700 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
        } text-white font-medium rounded-lg transition-all duration-200`}
      >
        {disabled ? 'Queue Full' : 'Generate Video'}
      </button>
    </form>
  );
}
