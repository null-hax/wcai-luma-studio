"use client";

import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { RiSettings4Line } from 'react-icons/ri';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem('lumaai-api-key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('lumaai-api-key', apiKey);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="relative bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-lg font-medium text-white">
              Settings
            </Dialog.Title>
            <RiSettings4Line className="w-6 h-6 text-gray-400" />
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                LumaAI API Key
              </label>
              <input
                type="text"
                className="sr-only"
                autoComplete="username"
                value="lumaai-api"
                readOnly
                aria-hidden="true"
              />
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full p-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-white focus:ring-2 focus:ring-white focus:outline-none"
                placeholder="Enter your API key..."
                autoComplete="new-password"
              />
              <p className="mt-1 text-sm text-gray-400">
                Your API key will be stored securely in your browser.
              </p>
            </div>
            
            <button
              type="submit"
              className="w-full flex justify-center items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-4 py-2 transition-colors"
            >
              Save Settings
            </button>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
