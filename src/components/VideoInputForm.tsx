"use client";

import { useState, useRef, useCallback } from 'react';
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
  const [error, setError] = useState<string | undefined>();
  const [keyframe, setKeyframe] = useState<string | undefined>();
  const [imageAspectRatio, setImageAspectRatio] = useState<AspectRatio | undefined>();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const getImageAspectRatio = useCallback((width: number, height: number): AspectRatio => {
    const ratio = width / height;
    if (Math.abs(ratio - 16/9) < 0.1) return "16:9";
    if (Math.abs(ratio - 9/16) < 0.1) return "9:16";
    if (Math.abs(ratio - 1) < 0.1) return "1:1";
    if (Math.abs(ratio - 4/3) < 0.1) return "4:3";
    if (Math.abs(ratio - 3/4) < 0.1) return "3:4";
    if (Math.abs(ratio - 21/9) < 0.1) return "21:9";
    if (Math.abs(ratio - 9/21) < 0.1) return "9:21";
    // Default to closest standard ratio
    if (ratio > 1) return "16:9";
    return "9:16";
  }, []);

  const uploadImage = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    const data = await response.json();
    return data.url;
  }, []);

  const handleImageUpload = useCallback(async (file: File) => {
    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file');
      }

      setIsUploading(true);
      const url = await uploadImage(file);
      
      // Create a temporary image to get dimensions
      const img = new Image();
      img.src = url;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const aspectRatio = getImageAspectRatio(img.width, img.height);
      setImageAspectRatio(aspectRatio);
      setAspectRatio(aspectRatio);
      setKeyframe(url);
      
      // Force 5s duration and minimum 720p resolution with image
      setDuration('5s');
      if (resolution === '540p') {
        setResolution('720p');
      }

      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  }, [getImageAspectRatio, resolution, uploadImage]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      await handleImageUpload(file);
    }
  }, [handleImageUpload]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleImageUpload(file);
    }
  };

  const clearKeyframe = () => {
    setKeyframe(undefined);
    setImageAspectRatio(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);

    // Validate that prompt is provided
    if (!prompt.trim()) {
      setError('Please provide a prompt');
      return;
    }

    let pollInterval: NodeJS.Timeout | null = null;
    let pollTimeout: NodeJS.Timeout | null = null;

    // Create initial generation object with temporary ID
    const initialGeneration: VideoGeneration = {
      id: uuidv4(), // Temporary ID
      prompt,
      status: 'pending',
      aspectRatio,
      resolution,
      duration,
      keyframe
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
          keyframe
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
        duration: data.duration || duration,
        keyframe
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
    <form 
      onSubmit={handleSubmit} 
      className={`relative ${isDragging ? 'bg-gray-900/50 ring-2 ring-blue-500/50' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col gap-2 p-2 bg-gray-900 rounded-2xl">
        {keyframe && (
          <div className="relative px-4">
            <div className="relative w-16 h-16 rounded group">
              <img
                ref={imgRef}
                src={keyframe}
                alt="Keyframe"
                className="w-full h-full object-cover rounded-md"
              />
              <button
                type="button"
                onClick={clearKeyframe}
                className="absolute hidden group-hover:block top-2 right-2 -mr-2 -mt-2 p-1 rounded-full bg-gray-900/70 text-gray-400 hover:text-gray-300 hover:scale-110 transition-all shadow-lg group z-10"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-transparent text-white placeholder-gray-500 outline-none resize-none px-4 flex py-4"
              onInput={() => {
                // No-op or remove this handler if not needed
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (prompt.trim() && !disabled) {
                    handleSubmit(e);
                  }
                }
              }}
              placeholder={keyframe ? "Describe camera or action in the scene..." : "What do you want to see..."}
              disabled={disabled}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`p-2 rounded-full hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed ${
                isUploading ? 'text-gray-500' : keyframe ? 'text-blue-400' : 'text-gray-400'
              }`}
              disabled={disabled || isUploading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
              </svg>
            </button>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value as Resolution)}
              className="bg-transparent text-gray-400 outline-none appearance-none cursor-pointer disabled:cursor-not-allowed"
              disabled={disabled}
            >
              {Object.entries(RESOLUTION_LABELS)
                .filter(([value]) => !keyframe || value !== '540p')
                .map(([value]) => (
                  <option key={value} value={value}>{value}</option>
                ))}
            </select>
            <div className="text-gray-400">·</div>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
              className="bg-transparent text-gray-400 outline-none appearance-none cursor-pointer disabled:cursor-not-allowed"
              disabled={disabled || !!imageAspectRatio}
            >
              {Object.entries(ASPECT_RATIO_LABELS).map(([value]) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <div className="text-gray-400">·</div>
            <button
              type="button"
              onClick={() => !keyframe && setDuration(duration === '5s' ? '9s' : '5s')}
              className={`text-gray-400 hover:text-gray-300 disabled:cursor-not-allowed disabled:opacity-50 ${
                keyframe ? 'cursor-not-allowed opacity-50' : ''
              }`}
              disabled={disabled || !!keyframe}
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
