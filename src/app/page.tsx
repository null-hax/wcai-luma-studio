"use client";

import { useState, useCallback, useEffect } from 'react';
import VideoInputForm from '../components/VideoInputForm';
import VideoDisplayGrid from '../components/VideoDisplayGrid';
import SettingsModal from '../components/SettingsModal';
import { VideoGeneration, MAX_CONCURRENT_GENERATIONS } from '../types/video';

export default function Page() {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [gridRef, setGridRef] = useState<{ 
    addGeneration: (generation: VideoGeneration) => void;
    reset: () => void;
  } | null>(null);
  const [activeGenerations, setActiveGenerations] = useState<number>(0);
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Check for API key on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('lumaai-api-key');
    setApiKey(savedApiKey);
  }, []);

  const handleApiKeySave = useCallback((newApiKey: string) => {
    setApiKey(newApiKey);
  }, []);

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
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl text-white uppercase bg-clip-text text-transparent">Luma API <span className="font-bold">Sequencer</span></h1>
              <p className="text-sm text-gray-400 pt-2">by <a href="https://nullhax.com" className="hover:underline" target="_blank">null_hax</a> // <a href="https://westcoastai.xyz" className="hover:underline" target="_blank">West Coast AI Labs</a></p>
              <p className="text-sm text-slate-400 pt-2">
                <a href="https://github.com/null-hax/wcai-luma-studio" className="hover:underline flex items-center gap-2" target="_blank">
                  <svg height="16" width="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                  </svg>
                  View source code
                </a>
              </p>
              {activeGenerations > 0 && apiKey && (
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
              <span>API Key</span>
            </button>
          </div>
          
          {apiKey && (
            <VideoInputForm 
              onGenerationStart={handleGenerationStart}
              onGenerationComplete={handleGenerationComplete}
              disabled={activeGenerations >= MAX_CONCURRENT_GENERATIONS}
            />
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {!apiKey ? (
          <div className="py-16 text-center">
            <div className="bg-gray-800/50 rounded-lg p-8 max-w-2xl mx-auto">
              <h2 className="text-2xl font-semibold mb-4">Welcome to Luma API Sequencer!</h2>
              <p className="text-gray-400 mb-6">
                To get started, you will need to set up your LumaAI API key.<br />
                Click the button below to configure your settings.
              </p>
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-6 py-3 transition-colors inline-flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                Configure API Key
              </button>
            </div>
          </div>
        ) : (
          <VideoDisplayGrid onRef={setGridRef} apiKey={apiKey} />
        )}
      </div>
      
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSave={handleApiKeySave}
      />
    </div>
  );
}
