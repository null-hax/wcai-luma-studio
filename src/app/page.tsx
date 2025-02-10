"use client";

import { useState, useCallback, useEffect } from 'react';
import VideoInputForm from '../components/VideoInputForm';
import VideoDisplayGrid from '../components/VideoDisplayGrid';
import SettingsModal from '../components/SettingsModal';
import { VideoGeneration, MAX_CONCURRENT_GENERATIONS } from '../types/video';

export default function Page() {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [gridRef, setGridRef] = useState<{ addGeneration: (generation: VideoGeneration) => void } | null>(null);
  const [activeGenerations, setActiveGenerations] = useState<number>(0);

  // Load initial generations
  useEffect(() => {
    const loadGenerations = async () => {
      try {
        const apiKey = localStorage.getItem('lumaai-api-key');
        if (!apiKey) return;

        const response = await fetch('/api/generateVideo', {
          headers: {
            'x-api-key': apiKey,
          },
        });
        
        if (!response.ok) return;
        
        const generations = await response.json() as VideoGeneration[];
        const pendingGenerations = generations.filter(gen => gen.status === 'pending');
        
        // Add all generations to grid
        generations.forEach(generation => {
          if (gridRef) {
            gridRef.addGeneration(generation);
          }
        });

        // Update active generations count
        setActiveGenerations(pendingGenerations.length);
      } catch (error) {
        console.error('Error loading generations:', error);
      }
    };

    loadGenerations();
  }, [gridRef]);

  const handleGenerationStart = useCallback((generation: VideoGeneration) => {
    if (gridRef) {
      gridRef.addGeneration(generation);
      setActiveGenerations(prev => prev + 1);
    }
  }, [gridRef]);

  const handleGenerationComplete = useCallback(() => {
    setActiveGenerations(prev => Math.max(0, prev - 1));
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Luma API Sequencer</h1>
            <p className="text-md text-gray-300 mt-1">by West Coast AI Labs</p>
            {activeGenerations > 0 && (
              <p className="text-sm text-gray-400 mt-1">
                {activeGenerations} of {MAX_CONCURRENT_GENERATIONS} generations in progress
              </p>
            )}
          </div>
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
          >
            Settings
          </button>
        </div>
        
        <VideoInputForm 
          onGenerationStart={handleGenerationStart}
          onGenerationComplete={handleGenerationComplete}
          disabled={activeGenerations >= MAX_CONCURRENT_GENERATIONS}
        />
        <VideoDisplayGrid onRef={setGridRef} />
        
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
        />
      </div>
    </div>
  );
}
