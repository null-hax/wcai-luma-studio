export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "21:9" | "9:21";
export type Resolution = "540p" | "720p" | "1080p";

export interface GenerateVideoRequest {
  prompt: string;
  aspectRatio?: AspectRatio;
  length?: string;
  resolution?: Resolution;
  keyframe?: string; // URL of the keyframe image
}

export interface LumaAIGeneration {
  id: string;
  prompt?: string;
  state: 'pending' | 'completed' | 'failed';
  created_at?: string;
  failure_reason?: string;
  aspect_ratio?: string;
  resolution?: string;
  duration?: string;
  assets?: {
    video?: string;
    image?: string;
  };
  request?: {
    prompt: string;
    aspect_ratio?: string;
    resolution?: string;
    duration?: string;
    keyframe?: string;
  };
}

export interface GenerateVideoResponse {
  id: string;
  url: string;
  filename: string;
}

export interface ListGenerationsResponse {
  generations: VideoGeneration[];
  hasMore: boolean;
  nextOffset?: number;
}

export interface VideoGeneration {
  id: string;
  prompt: string;
  url?: string;
  thumbnailUrl?: string;
  status: 'pending' | 'completed' | 'failed';
  error?: string;
  aspectRatio: AspectRatio;
  resolution?: Resolution;
  duration: string;
  keyframe?: string;
}

export const MAX_CONCURRENT_GENERATIONS = 20;
export const DEFAULT_ASPECT_RATIO: AspectRatio = "16:9";
export const DEFAULT_DURATION = "5s";
export const DEFAULT_RESOLUTION: Resolution = "1080p";

export const ASPECT_RATIO_LABELS: Record<AspectRatio, string> = {
  "16:9": "16:9 Landscape",
  "9:16": "9:16 Portrait",
  "1:1": "1:1 Square",
  "4:3": "4:3 Classic",
  "3:4": "3:4 Portrait",
  "21:9": "21:9 Ultrawide",
  "9:21": "9:21 Vertical"
};

export const RESOLUTION_LABELS: Record<Resolution, string> = {
  "540p": "540p",
  "720p": "720p",
  "1080p": "1080p"
};
