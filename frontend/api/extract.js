export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { url } = await request.json();

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if it's a YouTube URL
    const youtubeId = extractYouTubeId(url);
    if (youtubeId) {
      return await handleYouTube(youtubeId, url);
    }

    // Check if it's Instagram/TikTok
    const videoPatterns = [/tiktok\.com/, /instagram\.com\/reel/, /instagram\.com\/p\//];
    const isVideo = videoPatterns.some(pattern => pattern.test(url));

    if (isVideo) {
      return new Response(JSON.stringify({
        title: 'Video Recipe',
        ingredients: [],
        instructions: [],
        source_url: url,
        source_type: 'video',
        error: 'Instagram/TikTok videos require OpenAI API. Run locally for full video support, or use YouTube videos which work here!',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle regular recipe websites
    return await handleWebsite(url);

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function handleYouTube(videoId, url) {
  try {
    // Fetch YouTube page to get video info
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    const html = await response.text();
    
    // Extract video title
    const titleMatch = html.match(/<title>([^<]*)<\/title>/);
    let title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : 'YouTube Recipe';

    // Try to get captions
    const transcript = await fetchYouTubeTranscript(videoId);
    
    if (!transcript) {
      return new Response(JSON.stringify({
        title: title,
        ingredients: [],
        instructions: [],
        source_url: url,
        source_type: 'video',
        platform: 'youtube',
        error: 'This YouTube video does not have captions available. Try a video with captions enabled.',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse the transcript into a recipe format
    const recipe = parseTranscriptToRecipe(transcript, title);
    recipe.source_url = url;
    recipe.source_type = 'video';
    recipe.platform = 'youtube';

    return new Response(JSON.stringify(recipe), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({
      title: 'YouTube Recipe',
      ingredients: [],
      instructions: [],
      source_url: url,
      source_type: 'video',
      error: 'Failed to extract from YouTube: ' + error.message,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function fetchYouTubeTranscript(videoId) {
  try {
    // Fetch the video page
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    const html = await response.text();

    // Find caption track URL
    const captionMatch = html.match(/"captionTracks":\s*\[(.*?)\]/);
    if (!captionMatch) return null;

    // Parse caption tracks
    const captionData = captionMatch[1];
    const urlMatch = captionData.match(/"baseUrl":\s*"([^"]+)"/);
    if (!urlMatch) return null;

    let captionUrl = urlMatch[1].replace(/\\u0026/g, '&');
    
    // Fetch captions
    const captionResponse = await fetch(captionUrl);
    const captionXml = await captionResponse.text();

    // Parse XML captions
    const textMatches = captionXml.matchAll(/<text[^>]*>([^<]*)<\/text>/g);
    const texts = [];
    for (const match of textMatches) {
      let text = match[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n/g, ' ')
        .trim();
      if (text) texts.push(text);
    }

    return texts.join(' ');
  } catch (error) {
    console.error('Transcript error:', error);
    return null;
  }
}

function parseTranscriptToRecipe(transcript, title) {
  // Simple parsing - split transcript into sentences
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  // Try to identify ingredients (sentences with quantities/measurements)
  const measurementPattern = /\b(\d+\/?\d*\s*(cup|tablespoon|tbsp|teaspoon|tsp|ounce|oz|pound|lb|gram|g|kg|ml|liter|pinch|dash|bunch|clove|slice|piece|can|package|pkg)s?)\b/i;
  const ingredients = [];
  const instructions = [];
  
  for (const sentence of sentences) {
    const cleaned = sentence.trim();
    if (measurementPattern.test(cleaned) && cleaned.length < 150) {
      // Likely an ingredient
      ingredients.push(cleaned);
    } else if (cleaned.length > 20) {
      // Likely an instruction
      instructions.push(cleaned);
    }
  }

  // If we couldn't parse well, just split into chunks
  if (ingredients.length === 0 && instructions.length === 0) {
    const chunks = transcript.match(/.{1,200}[.!?]|.{1,200}$/g) || [];
    return {
      title: title,
      ingredients: ['See instructions below - ingredients mentioned throughout'],
      instructions: chunks.slice(0, 15).map(c => c.trim()),
      tips: ['This recipe was extracted from video captions. Some details may need verification.'],
    };
  }

  return {
    title: title,
    ingredients: ingredients.length > 0 ? ingredients : ['See video for ingredients'],
    instructions: instructions.length > 0 ? instructions.slice(0, 20) : ['See video for instructions'],
    tips: ['This recipe was extracted from video captions. Quantities may need verification.'],
  };
}

async function handleWebsite(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
      },
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ 
        error: `Failed to fetch the URL (status: ${response.status}). The website may be blocking automated requests.` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const html = await response.text();
    
    // Check if we got a meaningful response
    if (html.length < 1000) {
      return new Response(JSON.stringify({
        title: '',
        ingredients: [],
        instructions: [],
        source_url: url,
        source_type: 'website',
        error: 'The website returned an empty or blocked response. Try running locally for better results.',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const recipe = extractRecipeFromHtml(html, url);

    if (!recipe) {
      return new Response(JSON.stringify({
        title: '',
        ingredients: [],
        instructions: [],
        source_url: url,
        source_type: 'website',
        error: 'Could not find structured recipe data on this page. The site may use a format we don\'t support yet, or try running locally.',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(recipe), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function extractRecipeFromHtml(html, url) {
  const jsonLdRegex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      let data = JSON.parse(match[1]);

      if (data['@graph']) {
        data = data['@graph'];
      }

      if (Array.isArray(data)) {
        for (const item of data) {
          const itemType = item['@type'];
          if (itemType === 'Recipe' || itemType === 'recipe' || 
              (Array.isArray(itemType) && itemType.includes('Recipe'))) {
            data = item;
            break;
          }
        }
      }

      const dataType = data['@type'];
      if (dataType === 'Recipe' || dataType === 'recipe' || 
          (Array.isArray(dataType) && dataType.includes('Recipe'))) {
        const ingredients = data.recipeIngredient || [];
        const rawInstructions = data.recipeInstructions || [];

        let instructions = [];
        if (Array.isArray(rawInstructions)) {
          for (const inst of rawInstructions) {
            if (typeof inst === 'string') {
              instructions.push(inst);
            } else if (inst.text) {
              instructions.push(inst.text);
            } else if (inst.name) {
              instructions.push(inst.name);
            }
          }
        } else if (typeof rawInstructions === 'string') {
          instructions = [rawInstructions];
        }

        let image = data.image;
        if (Array.isArray(image)) {
          image = image[0];
        }
        if (typeof image === 'object' && image !== null) {
          image = image.url || image['@id'] || null;
        }

        let servings = data.recipeYield;
        if (Array.isArray(servings)) {
          servings = servings[0];
        }

        return {
          title: data.name || 'Unknown Recipe',
          ingredients: ingredients,
          instructions: instructions,
          prep_time: data.prepTime || null,
          cook_time: data.cookTime || null,
          total_time: data.totalTime || null,
          servings: servings ? String(servings) : null,
          image_url: image,
          source_url: url,
          source_type: 'website',
        };
      }
    } catch (e) {
      continue;
    }
  }

  return null;
}
