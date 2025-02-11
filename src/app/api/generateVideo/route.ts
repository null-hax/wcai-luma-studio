import { NextRequest, NextResponse } from 'next/server';
import { LumaAI } from 'lumaai';
import { 
  AspectRatio, 
  GenerateVideoRequest,
  VideoGeneration,
  LumaAIGeneration,
  DEFAULT_ASPECT_RATIO, 
  DEFAULT_DURATION,
  ASPECT_RATIO_LABELS
} from '@/types/video';

function getLumaAIClient(apiKey: string) {
  return new LumaAI({
    authToken: apiKey,
  });
}

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
      return NextResponse.json({ error: 'Please set your API key in settings first' }, { status: 401 });
    }

    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');
    const limit = 20;

    const client = getLumaAIClient(apiKey);
    const response = await client.generations.list({ 
      limit,
      offset
    });

    // Get full details for each generation
    const generationsWithUrls: VideoGeneration[] = [];
    const generations = (Array.isArray(response) ? response : response.generations || []) as LumaAIGeneration[];
    
    // Sort by creation date in descending order
    const sortedGenerations = generations.sort((a, b) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return dateB.getTime() - dateA.getTime();
    });

    const hasMore = generations.length === limit;

    // Get full details for each generation
    for (const gen of sortedGenerations) {
      if (gen.state === 'failed') continue;
      
      try {
        // Fetch full generation details to get accurate metadata
        const fullGeneration = await client.generations.get(gen.id) as LumaAIGeneration;
        
        // Extract metadata from the full generation response
        const metadata = {
          aspectRatio: fullGeneration.aspect_ratio || fullGeneration.request?.aspect_ratio || gen.aspect_ratio,
          duration: fullGeneration.duration || fullGeneration.request?.duration || gen.duration
        };
        
        // Ensure we have valid metadata
        const validatedMetadata = {
          aspectRatio: metadata.aspectRatio && 
            Object.keys(ASPECT_RATIO_LABELS).includes(metadata.aspectRatio) ? 
            metadata.aspectRatio as AspectRatio : 
            DEFAULT_ASPECT_RATIO,
          duration: metadata.duration || DEFAULT_DURATION
        };
        
        generationsWithUrls.push({
          id: gen.id,
          prompt: fullGeneration.request?.prompt || fullGeneration.prompt || gen.prompt || 'Unknown prompt',
          status: fullGeneration.state as 'pending' | 'completed' | 'failed',
          url: fullGeneration.assets?.video,
          thumbnailUrl: fullGeneration.assets?.image,
          aspectRatio: validatedMetadata.aspectRatio,
          duration: validatedMetadata.duration
        });
      } catch (error) {
        console.error(`Error fetching details for generation ${gen.id}:`, error);
        // Skip this generation if we can't get its details
        continue;
      }
    }

    return NextResponse.json({
      generations: generationsWithUrls,
      hasMore,
      nextOffset: hasMore ? offset + limit : undefined
    });
  } catch (error: unknown) {
    console.error('Error listing generations:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      code: error instanceof Error ? error.cause : undefined
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

    // Return immediately after starting the generation
    return NextResponse.json({
      id: generation.id,
      status: 'pending',
      aspectRatio: generationOptions.aspect_ratio,
      duration: generationOptions.duration
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
