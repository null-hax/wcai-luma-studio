"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { VideoGeneration, ListGenerationsResponse } from '../types/video';
import VideoPlayer from './VideoPlayer';

interface VideoDisplayGridProps {
  onRef?: (ref: { 
    addGeneration: (generation: VideoGeneration) => void;
    reset: () => void;
  }) => void;
  apiKey: string | null;
}

const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
    {[...Array(12)].map((_, i) => (
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

export default function VideoDisplayGrid({ onRef, apiKey }: VideoDisplayGridProps) {
  const [generations, setGenerations] = useState<VideoGeneration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadGenerations = async (currentOffset: number) => {
    try {
      if (!apiKey) return;

      const response = await fetch(`/api/generateVideo?offset=${currentOffset}`, {
        headers: {
          'x-api-key': apiKey,
        },
      });
      
      if (!response.ok) return;
      
      const data = await response.json() as ListGenerationsResponse;
      
      if (currentOffset === 0) {
        setGenerations(data.generations);
      } else {
        setGenerations(prev => {
          // Filter out any duplicates from the new data
          const newGenerations = data.generations.filter(
            newGen => !prev.some(existingGen => existingGen.id === newGen.id)
          );
          return [...prev, ...newGenerations];
        });
      }
      
      setHasMore(data.hasMore);
      if (data.nextOffset) {
        setOffset(data.nextOffset);
      }
      setIsLoading(false);
      setIsLoadingMore(false);
    } catch (error) {
      console.error('Error loading generations:', error);
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadGenerations(0);
  }, [apiKey]);

  // Infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || isLoadingMore || !apiKey) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          setIsLoadingMore(true);
          loadGenerations(offset);
        }
      },
      { rootMargin: '1000px' } // Load more when within 1000px of the bottom
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, offset, apiKey]);

  const reset = useCallback(() => {
    setGenerations([]);
    setOffset(0);
    setHasMore(true);
    setIsLoading(true);
    loadGenerations(0);
  }, []);

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

  const handleDeleteGeneration = async (id: string) => {
    if (!apiKey || isDeleting) return;
    
    try {
      setIsDeleting(id);
      
      const response = await fetch(`/api/generateVideo?id=${id}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': apiKey,
        },
      });
      
      if (response.ok) {
        // Remove the deleted generation from the state
        setGenerations(prev => prev.filter(gen => gen.id !== id));
      } else {
        console.error('Failed to delete generation:', await response.text());
      }
    } catch (error) {
      console.error('Error deleting generation:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  const copyPromptToClipboard = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch (error) {
      console.error('Failed to copy prompt:', error);
    }
  };

  // Expose functions to parent
  useEffect(() => {
    if (onRef) {
      onRef({ addGeneration, reset });
    }
  }, [onRef, addGeneration, reset]);

  if (!apiKey) {
    return null;
  }

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
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-16">
        {generations.map((generation) => (
          <div 
            key={generation.id} 
            className="bg-gray-800 rounded-lg overflow-hidden"
          >
            <div className="aspect-video">
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
                  id={generation.id}
                  url={generation.url}
                  thumbnailUrl={generation.thumbnailUrl}
                  onDelete={handleDeleteGeneration}
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

      {/* Infinite scroll trigger */}
      <div ref={loadMoreRef} className="h-px" />

      {/* Loading more indicator */}
      {isLoadingMore && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
}
