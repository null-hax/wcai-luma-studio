"use client";

import { useState, useRef, useEffect } from 'react';

interface VideoPlayerProps {
  url?: string;
  thumbnailUrl?: string;
  aspectRatio: string;
}

export default function VideoPlayer({ url, thumbnailUrl, aspectRatio }: VideoPlayerProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load video when URL changes
  useEffect(() => {
    if (videoRef.current && url) {
      videoRef.current.load();
    }
  }, [url]);

  // Handle hover state with proper cleanup
  useEffect(() => {
    let mounted = true;
    let playTimeout: NodeJS.Timeout;
    let playPromise: Promise<void> | undefined;

    const startVideo = async () => {
      if (!videoRef.current || !url) return;
      
      try {
        // Add a small delay before playing to ensure proper loading
        playTimeout = setTimeout(async () => {
          if (!mounted || !videoRef.current) return;
          
          videoRef.current.currentTime = 0;
          playPromise = videoRef.current.play();
          
          try {
            await playPromise;
            if (mounted) {
              setIsVideoLoaded(true);
            }
          } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError') {
              console.error('Error playing video:', error);
            }
          }
        }, 100);
      } catch (error) {
        console.error('Error starting video:', error);
      }
    };

    const stopVideo = async () => {
      clearTimeout(playTimeout);
      if (!videoRef.current) return;
      
      try {
        if (playPromise) {
          await playPromise;
        }
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setIsVideoLoaded(false);
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error stopping video:', error);
        }
      }
    };

    if (isHovering) {
      startVideo();
    } else {
      stopVideo();
    }

    return () => {
      mounted = false;
      clearTimeout(playTimeout);
      stopVideo();
    };
  }, [isHovering, url]);

  const handleMouseEnter = () => setIsHovering(true);
  const handleMouseLeave = () => setIsHovering(false);

  const handleDownload = async () => {
    if (!url) return;
    
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `video-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading video:', error);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative group aspect-video bg-gray-900"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Thumbnail */}
      {/* Show thumbnail when not hovering or when video hasn't loaded */}
      {thumbnailUrl && (!isHovering || !isVideoLoaded) && (
        <img
          src={thumbnailUrl}
          alt="Video thumbnail"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Video */}
      {/* Show video placeholder if no thumbnail */}
      {!thumbnailUrl && !isHovering && (
        <div className="absolute inset-0 bg-gray-900" />
      )}

      {/* Video */}
      {url && (
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isHovering ? 'opacity-100' : 'opacity-0'
          }`}
          loop
          muted
          playsInline
          preload="none"
        >
          <source src={url} type="video/mp4" />
        </video>
      )}

      {/* Download button */}
      <button
        onClick={handleDownload}
        className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/75 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-5 w-5" 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path 
            fillRule="evenodd" 
            d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" 
            clipRule="evenodd" 
          />
        </svg>
      </button>

      {/* Loading indicator */}
      {isHovering && !isVideoLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
        </div>
      )}
    </div>
  );
}
