import { NextRequest, NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import { LumaAI } from 'lumaai';
import fetch from 'node-fetch';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { 
  AspectRatio, 
  GenerateVideoRequest,
  VideoGeneration,
  LumaAIGeneration,
  DEFAULT_ASPECT_RATIO, 
  DEFAULT_DURATION, 
  DEFAULT_RESOLUTION 
} from '@/types/video';

function getLumaAIClient(apiKey: string) {
  return new LumaAI({
    authToken: apiKey,
  });
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
      return NextResponse.json({ error: 'Please set your API key in settings first' }, { status: 401 });
    }

    const client = getLumaAIClient(apiKey);
    const response = await client.generations.list({ limit: 50 });
    console.log('Generations response:', JSON.stringify(response, null, 2));
    const generations = (Array.isArray(response) ? response : response.generations || []) as LumaAIGeneration[];

    // Get list of local video files
    const videosDir = join(process.cwd(), 'public', 'videos');
    const files = await readdir(videosDir);
    const videoFiles = files.filter(file => file.endsWith('.mp4'));

    // Filter out failed generations and map to include local file URLs
    const generationsWithUrls: VideoGeneration[] = generations
      .filter(gen => gen.state !== 'failed')
      .map(gen => ({
      id: gen.id,
      prompt: gen.request?.prompt || gen.prompt || 'Unknown prompt',
      status: gen.state as 'pending' | 'completed' | 'failed',
      url: videoFiles.includes(`${gen.id}.mp4`) ? `/videos/${gen.id}.mp4` : undefined,
      thumbnailUrl: gen.assets?.image,
      aspectRatio: (gen.aspect_ratio as AspectRatio) || DEFAULT_ASPECT_RATIO,
      duration: gen.duration || DEFAULT_DURATION
    }));

    // Return generations in reverse chronological order
    return NextResponse.json(generationsWithUrls.reverse());
  } catch (error: any) {
    console.error('Error listing generations:', error);
    return NextResponse.json({ 
      error: error?.message || 'An unexpected error occurred',
      code: error?.code
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
      return NextResponse.json({ error: 'Please set your API key in settings first' }, { status: 401 });
    }

    const body = await request.json() as GenerateVideoRequest;
    if (!body.prompt || !body.prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const client = getLumaAIClient(apiKey);
    const { prompt, aspectRatio, length } = body;
    const safeAspectRatio: AspectRatio = aspectRatio ?? DEFAULT_ASPECT_RATIO;
    const safeLength: string = length ?? DEFAULT_DURATION;
    
    // Ensure parameters are valid strings
    if (typeof safeAspectRatio !== 'string' || typeof safeLength !== 'string') {
      return NextResponse.json({ error: 'Invalid parameter types' }, { status: 400 });
    }
    
    // Ensure parameters are not empty
    if (!safeAspectRatio.trim() || !safeLength.trim()) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Create generation with ray-2 model
    // Convert duration from "5s" format to number
    const durationInSeconds = parseInt(safeLength.replace("s", ""));
    if (isNaN(durationInSeconds)) {
      return NextResponse.json({ error: 'Invalid duration format' }, { status: 400 });
    }

    const generationOptions = {
      prompt: prompt,
      model: "ray-2" as const,
      resolution: "720p",
      aspect_ratio: safeAspectRatio,
      duration: `${durationInSeconds}s`
    };

    console.log('Creating generation with params:', generationOptions);
    const generation = await client.generations.create(generationOptions);

    if (!generation) {
      return NextResponse.json({ error: 'Failed to create generation' }, { status: 500 });
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
          return NextResponse.json(
            { error: `Generation failed: ${updatedGeneration.failure_reason || 'Unknown error'}` },
            { status: 500 }
          );
        default:
          await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    // Download the video file
    if (!downloadUrl) {
      return NextResponse.json({ error: 'No download URL found' }, { status: 500 });
    }

    const response = await fetch(downloadUrl);
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to download video' }, { status: 500 });
    }

    // Get the buffer once and reuse it
    const buffer = await response.arrayBuffer();

    // Save file to public directory
    const outputFilePath = join(process.cwd(), 'public', 'videos');
    try {
      await mkdir(outputFilePath, { recursive: true });
      await writeFile(join(outputFilePath, `${generation.id}.mp4`), Buffer.from(buffer));
    } catch (error) {
      console.error('Error saving video:', error);
      throw error;
    }

    // Get the updated generation to get the thumbnail URL
    const finalGeneration = await client.generations.get(generation.id as string);
    
    return NextResponse.json({
      id: generation.id,
      url: downloadUrl,
      filename: `${generation.id}.mp4`,
      thumbnailUrl: finalGeneration.assets?.image
    });

  } catch (error: any) {
    console.error('Error generating video:', error);
    
    // Handle LumaAI API errors
    if (error?.response?.data) {
      const apiError = error.response.data;
      return NextResponse.json({ 
        error: apiError.detail || apiError.message || 'API Error',
        code: apiError.code
      }, { status: error.response.status || 500 });
    }
    
    // Handle other errors
    return NextResponse.json({ 
      error: error?.message || 'An unexpected error occurred',
      code: error?.code
    }, { status: 500 });
  }
}
