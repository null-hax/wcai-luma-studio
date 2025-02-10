import { NextApiRequest, NextApiResponse } from 'next';
import { LumaAI } from 'lumaai';
import fetch from 'node-fetch';
import { writeFile } from 'fs/promises';
import { join, dirname } from 'path';

const client = new LumaAI({
  authToken: process.env.LUMAAI_API_KEY,
});

interface GenerateVideoRequest {
  prompt: string;
  aspectRatio?: string;
  length?: string;
}

const DEFAULT_ASPECT_RATIO = "16:9";
const DEFAULT_DURATION = "5s";
const DEFAULT_RESOLUTION = "720p";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { prompt, aspectRatio, length } = req.body as GenerateVideoRequest;
    const safeAspectRatio: string = aspectRatio ?? DEFAULT_ASPECT_RATIO;
    const safeLength: string = length ?? DEFAULT_DURATION;
    
    // Ensure parameters are valid strings
    if (typeof safeAspectRatio !== 'string' || typeof safeLength !== 'string') {
      throw new Error('Invalid parameter types');
    }
    
    // Ensure parameters are not empty
    if (!safeAspectRatio.trim() || !safeLength.trim()) {
      throw new Error('Missing required parameters');
    }

    // Create generation with ray-2 model

    // Convert aspect ratio to resolution
    let resolution = "1920x1080"; // default 16:9
    switch (safeAspectRatio) {
      case "1:1":
        resolution = "1080x1080";
        break;
      case "9:16":
        resolution = "1080x1920";
        break;
      case "4:3":
        resolution = "1440x1080";
        break;
      case "3:4":
        resolution = "1080x1440";
        break;
      case "21:9":
        resolution = "2560x1080";
        break;
      case "9:21":
        resolution = "1080x2560";
        break;
    }

    const generation = await client.generations.create({
      prompt,
      model: "ray-2",
      resolution,
      duration: safeLength,
    });

    if (!generation) {
      throw new Error('Failed to create generation');
    }

    let completed = false;
    let downloadUrl = "";

    // Poll generation status
    while (!completed) {
      const updatedGeneration = await client.generations.get(generation.id as string);
      
      switch (updatedGeneration.state) {
        case "completed":
          completed = true;
          if (updatedGeneration.assets && updatedGeneration.assets.video) {
            downloadUrl = updatedGeneration.assets.video;
          }
          break;
        case "failed":
          throw new Error(`Generation failed: ${updatedGeneration.failure_reason || 'Unknown error'}`);
        default:
          await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    // Download the video file
    if (!downloadUrl) {
      throw new Error('No download URL found');
    }

    const response = await fetch(downloadUrl);
    if (!response.body) {
      throw new Error('No response body received');
    }

    // Save file to /tmp directory
    const outputFilePath = join(dirname(''), `/tmp/${generation.id}.mp4`);
    await writeFile(outputFilePath, await response.buffer());

    res.status(200).json({
      id: generation.id,
      url: downloadUrl,
      filename: `${generation.id}.mp4`
    });

  } catch (error) {
    console.error('Error generating video:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ 
      message: 'Failed to generate video',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
