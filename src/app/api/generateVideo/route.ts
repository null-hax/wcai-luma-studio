import { NextRequest, NextResponse } from 'next/server';
import { LumaAI } from 'lumaai';
import { 
  AspectRatio, 
  GenerateVideoRequest,
  VideoGeneration,
  LumaAIGeneration,
  DEFAULT_ASPECT_RATIO, 
  DEFAULT_DURATION
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

    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');
    const limit = 50;

    const client = getLumaAIClient(apiKey);
    const response = await client.generations.list({ 
      limit,
      offset
    });

    let generations = (Array.isArray(response) ? response : response.generations || []) as LumaAIGeneration[];
    // Sort by creation date in descending order
    generations = generations.sort((a, b) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return dateB.getTime() - dateA.getTime();
    });
    const hasMore = generations.length === limit;

    // Filter out failed generations and map to include video URLs
    const generationsWithUrls: VideoGeneration[] = generations
      .filter(gen => gen.state !== 'failed')
      .map(gen => ({
        id: gen.id,
        prompt: gen.request?.prompt || gen.prompt || 'Unknown prompt',
        status: gen.state as 'pending' | 'completed' | 'failed',
        url: gen.assets?.video,
        thumbnailUrl: gen.assets?.image,
        aspectRatio: (gen.aspect_ratio as AspectRatio) || DEFAULT_ASPECT_RATIO,
        duration: gen.duration || DEFAULT_DURATION
      }));

    return NextResponse.json({
      generations: generationsWithUrls,
      hasMore,
      nextOffset: hasMore ? offset + limit : undefined
    });
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
    let finalGeneration = generation;

    // Poll generation status
    while (!completed) {
      finalGeneration = await client.generations.get(generation.id as string);
      
      switch (finalGeneration.state) {
        case "completed":
          completed = true;
          break;
        case "failed":
          return NextResponse.json(
            { error: `Generation failed: ${finalGeneration.failure_reason || 'Unknown error'}` },
            { status: 500 }
          );
        default:
          await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    if (!finalGeneration.assets?.video) {
      return NextResponse.json({ error: 'No video URL found' }, { status: 500 });
    }

    return NextResponse.json({
      id: finalGeneration.id,
      url: finalGeneration.assets.video,
      thumbnailUrl: finalGeneration.assets.image
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
