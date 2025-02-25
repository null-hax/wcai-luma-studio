"use client";

import { useEffect, useRef } from 'react';
import { VideoGeneration } from '../types/video';

interface VideoModalProps {
  video: VideoGeneration | null;
  onClose: () => void;
}

export default function VideoModal({ video, onClose }: VideoModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Play video when modal opens
  useEffect(() => {
    if (videoRef.current && video?.url) {
      videoRef.current.load();
      const playPromise = videoRef.current.play();
      
      // Handle play promise to avoid uncaught promise errors
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Error playing video in modal:', error);
        });
      }
    }

    // Prevent body scrolling when modal is open
    if (video) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [video]);

  // Close when clicking outside the video
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && e.target === modalRef.current) {
      onClose();
    }
  };

  if (!video) return null;

  return (
    <div 
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full h-full max-w-6xl max-h-[80vh] flex flex-col bg-[#0a0a0d] rounded-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/75 text-white p-2 rounded-full transition-colors"
          aria-label="Close modal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Video container */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
          {video.status === 'completed' && video.url ? (
            <video
              ref={videoRef}
              className="max-w-full max-h-full object-scale-down"
              controls
              autoPlay
              loop
            >
              <source src={video.url} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="text-center text-white">
              <p>{video.status === 'pending' ? 'Video is still processing...' : 'Video failed to load'}</p>
            </div>
          )}
        </div>

        {/* Video info */}
        <div className="bg-gray-800 rounded-b-2xl p-8 text-white">
          <p className="text-base mb-2">{video.prompt}</p>
          <div className="flex justify-between text-xs text-gray-400">
            <span>{video.resolution} • {video.aspectRatio} • {video.duration}</span>
            <div className="flex space-x-4">
              {/* Download button */}
              {video.url && (
                <a
                  href={video.url}
                  download={`video-${video.id}.mp4`}
                  className="flex items-center hover:text-blue-400 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Download
                </a>
              )}
              
              {/* Copy prompt button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(video.prompt);
                }}
                className="flex items-center hover:text-blue-400 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
                Copy prompt
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}