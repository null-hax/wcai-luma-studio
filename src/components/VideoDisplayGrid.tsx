"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { VideoGeneration } from '../types/video';
import VideoPlayer from './VideoPlayer';

interface VideoDisplayGridProps {
  onRef?: (ref: { addGeneration: (generation: VideoGeneration) => void }) => void;
}

const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16 max-w-7xl mx-auto px-8">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="bg-gray-800 rounded-lg overflow-hidden animate-pulse">
        <div className="aspect-video bg-gray-700" />
        <div className="p-3">
          <div className="h-4 bg-gray-700 rounded w-3/4" />
          <div className="h-3 bg-gray-700 rounded w-1/2 mt-2" />
        </div>
      </div>
    ))}
  </div>
);

export default function VideoDisplayGrid({ onRef }: VideoDisplayGridProps) {
  const [generations, setGenerations] = useState<VideoGeneration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const parentRef = useRef<HTMLDivElement>(null);

  // Calculate number of columns based on screen width
  const getColumnCount = () => {
    if (typeof window === 'undefined') return 3;
    if (window.innerWidth < 768) return 1;
    if (window.innerWidth < 1024) return 2;
    return 3;
  };

  const [columnCount, setColumnCount] = useState(getColumnCount());

  // Update column count on window resize
  useEffect(() => {
    const handleResize = () => {
      setColumnCount(getColumnCount());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Simulate initial loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Calculate row count based on number of items and columns
  const rowCount = Math.ceil(generations.length / columnCount);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 380, // Estimated row height: video (240px) + text (80px) + gap (60px)
    overscan: 3, // Number of items to render outside of the visible area
  });

  const addGeneration = useCallback((generation: VideoGeneration) => {
    setGenerations(prev => {
      // Check if this generation already exists
      const existingIndex = prev.findIndex(g => g.id === generation.id);
      if (existingIndex !== -1) {
        // Update existing generation
        const newGenerations = [...prev];
        newGenerations[existingIndex] = generation;
        return newGenerations;
      }
      // Add new generation
      return [generation, ...prev];
    });
  }, []);

  const copyPromptToClipboard = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch (error) {
      console.error('Failed to copy prompt:', error);
    }
  };

  // Expose addGeneration function to parent
  useEffect(() => {
    if (onRef) {
      onRef({ addGeneration });
    }
  }, [onRef, addGeneration]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (generations.length === 0) {
    return (
      <div className="text-center py-12 max-w-7xl mx-auto">
        <p className="text-gray-400">No videos generated yet. Use the form above to create one!</p>
      </div>
    );
  }

  return (
    <div 
      ref={parentRef} 
      className="h-[calc(100vh-300px)] overflow-auto"
    >
      <div
        className="max-w-7xl mx-auto px-8"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map(virtualRow => {
          const startIndex = virtualRow.index * columnCount;
          const rowGenerations = generations.slice(startIndex, startIndex + columnCount);

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
                // Remove marginBottom since we're using gap-y for spacing
              }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16 pb-16"
            >
              {rowGenerations.map((generation) => (
                <div 
                  key={generation.id} 
                  className="bg-gray-800 rounded-lg overflow-hidden"
                >
                  <div className="w-full aspect-video">
                    {generation.status === 'pending' ? (
                      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                      </div>
                    ) : generation.status === 'failed' ? (
                      <div className="w-full h-full bg-gray-900 flex items-center justify-center text-red-500">
                        <p className="text-center px-4">{generation.error || 'Generation failed'}</p>
                      </div>
                    ) : (
                      <VideoPlayer
                        url={generation.url}
                        thumbnailUrl={generation.thumbnailUrl}
                        aspectRatio={generation.aspectRatio}
                      />
                    )}
                  </div>
                  <div 
                    className="p-3 cursor-pointer hover:bg-gray-700/50 transition-colors"
                    onClick={() => copyPromptToClipboard(generation.prompt)}
                  >
                    <p className="text-sm text-gray-300 line-clamp-2">{generation.prompt}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-500">
                        {generation.aspectRatio} • {generation.duration}
                      </p>
                      <span className="text-xs text-blue-400 group-hover:text-blue-300">Click to copy prompt</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
