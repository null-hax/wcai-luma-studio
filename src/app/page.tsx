"use client";

import { useState, useCallback, useEffect } from 'react';
import VideoInputForm from '../components/VideoInputForm';
import VideoDisplayGrid from '../components/VideoDisplayGrid';
import SettingsModal from '../components/SettingsModal';
import { VideoGeneration, MAX_CONCURRENT_GENERATIONS, ListGenerationsResponse } from '../types/video';

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
        
        const data = await response.json() as ListGenerationsResponse;
        const pendingGenerations = data.generations.filter((gen: VideoGeneration) => gen.status === 'pending');
        
        // Add all generations to grid
        data.generations.forEach((generation: VideoGeneration) => {
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
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">Luma API Sequencer</h1>
              <p className="text-sm text-gray-400">by West Coast AI Labs</p>
              {activeGenerations > 0 && (
                <p className="text-sm text-gray-400 mt-1">
                  {activeGenerations} of {MAX_CONCURRENT_GENERATIONS} generations in progress
                </p>
              )}
            </div>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              <span>Settings</span>
            </button>
          </div>
          
          <VideoInputForm 
            onGenerationStart={handleGenerationStart}
            onGenerationComplete={handleGenerationComplete}
            disabled={activeGenerations >= MAX_CONCURRENT_GENERATIONS}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <VideoDisplayGrid onRef={setGridRef} />
      </div>
      
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
}
