import { NextApiRequest, NextApiResponse } from 'next';
import { LumaAI } from 'lumaai';
import fetch from 'node-fetch';
import { writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import {
  GenerateVideoRequest,
  AspectRatio,
  Resolution,
  DEFAULT_ASPECT_RATIO,
  DEFAULT_DURATION,
  DEFAULT_RESOLUTION
} from '../types/video';

const client = new LumaAI({
  authToken: process.env.LUMAAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { prompt, aspectRatio, resolution, length } = req.body as GenerateVideoRequest;
    const safeAspectRatio: AspectRatio = aspectRatio as AspectRatio ?? DEFAULT_ASPECT_RATIO;
    const safeResolution: Resolution = resolution as Resolution ?? DEFAULT_RESOLUTION;
    const safeLength: string = length ?? DEFAULT_DURATION;
    
    // Ensure parameters are valid strings
    if (typeof safeAspectRatio !== 'string' || typeof safeResolution !== 'string' || typeof safeLength !== 'string') {
      throw new Error('Invalid parameter types');
    }
    
    // Ensure parameters are not empty
    if (!safeAspectRatio.trim() || !safeResolution.trim() || !safeLength.trim()) {
      throw new Error('Missing required parameters');
    }

    // Create generation with ray-2 model
    const generation = await client.generations.create({
      prompt,
      model: "ray-2",
      resolution: safeResolution,
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
