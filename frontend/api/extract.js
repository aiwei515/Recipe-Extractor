// Vercel Serverless Function for recipe extraction
export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Check if it's YouTube
    const youtubeId = extractYouTubeId(url);
    if (youtubeId) {
      const result = await handleYouTube(youtubeId, url);
      return res.status(200).json(result);
    }

    // Check if it's Instagram/TikTok (not supported on hosted version)
    const unsupportedVideo = [/tiktok\.com/, /instagram\.com\/reel/, /instagram\.com\/p\//];
    if (unsupportedVideo.some(pattern => pattern.test(url))) {
      return res.status(200).json({
        title: 'Video Recipe',
        ingredients: [],
        instructions: [],
        source_url: url,
        source_type: 'video',
        error: 'Instagram/TikTok videos require running locally with OpenAI API. Try YouTube videos or recipe websites instead!',
      });
    }

    // Handle recipe websites
    const result = await handleWebsite(url);
    return res.status(200).json(result);

  } catch (error) {
    return res.status(500).json({ error: error.message });
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
    // Fetch YouTube page
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    
    const html = await response.text();
    
    // Extract video title
    const titleMatch = html.match(/<title>([^<]*)<\/title>/);
    let title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : 'YouTube Recipe';

    // Get captions
    const transcript = await fetchYouTubeTranscript(html);
    
    if (!transcript) {
      return {
        title: title,
        ingredients: [],
        instructions: [],
        source_url: url,
        source_type: 'video',
        platform: 'youtube',
        error: 'This YouTube video does not have captions available. Try a video with captions/subtitles enabled.',
      };
    }

    // Parse transcript into recipe
    const recipe = parseTranscriptToRecipe(transcript, title);
    recipe.source_url = url;
    recipe.source_type = 'video';
    recipe.platform = 'youtube';

    return recipe;

  } catch (error) {
    return {
      title: 'YouTube Recipe',
      ingredients: [],
      instructions: [],
      source_url: url,
      source_type: 'video',
      error: 'Failed to extract from YouTube: ' + error.message,
    };
  }
}

async function fetchYouTubeTranscript(html) {
  try {
    // Find caption track URL in the page
    const captionMatch = html.match(/"captionTracks":\s*\[(.*?)\]/);
    if (!captionMatch) return null;

    const urlMatch = captionMatch[1].match(/"baseUrl":\s*"([^"]+)"/);
    if (!urlMatch) return null;

    let captionUrl = urlMatch[1].replace(/\\u0026/g, '&');
    
    // Fetch captions XML
    const captionResponse = await fetch(captionUrl);
    const captionXml = await captionResponse.text();

    // Parse captions
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
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  // Identify ingredients (sentences with measurements)
  const measurementPattern = /\b(\d+\/?\d*\s*(cup|tablespoon|tbsp|teaspoon|tsp|ounce|oz|pound|lb|gram|g|kg|ml|liter|pinch|dash|bunch|clove|slice|piece|can|package)s?)\b/i;
  const ingredients = [];
  const instructions = [];
  
  for (const sentence of sentences) {
    const cleaned = sentence.trim();
    if (measurementPattern.test(cleaned) && cleaned.length < 150) {
      ingredients.push(cleaned);
    } else if (cleaned.length > 20) {
      instructions.push(cleaned);
    }
  }

  if (ingredients.length === 0 && instructions.length === 0) {
    const chunks = transcript.match(/.{1,200}[.!?]|.{1,200}$/g) || [];
    return {
      title: title,
      ingredients: ['See instructions below - ingredients mentioned throughout'],
      instructions: chunks.slice(0, 15).map(c => c.trim()),
      tips: ['Recipe extracted from video captions. Some details may need verification.'],
    };
  }

  return {
    title: title,
    ingredients: ingredients.length > 0 ? ingredients : ['See video for ingredient list'],
    instructions: instructions.length > 0 ? instructions.slice(0, 20) : ['See video for instructions'],
    tips: ['Recipe extracted from video captions. Quantities may need verification.'],
  };
}

async function handleWebsite(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      return { error: `Failed to fetch URL (status: ${response.status}). The site may be blocking requests.` };
    }

    const html = await response.text();

    if (html.length < 1000) {
      return {
        title: '',
        ingredients: [],
        instructions: [],
        source_url: url,
        source_type: 'website',
        error: 'The website returned an empty response. Try running locally.',
      };
    }

    const recipe = extractRecipeFromHtml(html, url);

    if (!recipe) {
      return {
        title: '',
        ingredients: [],
        instructions: [],
        source_url: url,
        source_type: 'website',
        error: 'Could not find recipe data. Try a different URL or run locally for better results.',
      };
    }

    return recipe;

  } catch (error) {
    return { error: error.message };
  }
}

function extractRecipeFromHtml(html, url) {
  const jsonLdRegex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      let data = JSON.parse(match[1]);

      if (data['@graph']) data = data['@graph'];

      if (Array.isArray(data)) {
        for (const item of data) {
          const t = item['@type'];
          if (t === 'Recipe' || t === 'recipe' || (Array.isArray(t) && t.includes('Recipe'))) {
            data = item;
            break;
          }
        }
      }

      const dataType = data['@type'];
      if (dataType === 'Recipe' || dataType === 'recipe' || (Array.isArray(dataType) && dataType.includes('Recipe'))) {
        const ingredients = data.recipeIngredient || [];
        const rawInstructions = data.recipeInstructions || [];

        let instructions = [];
        if (Array.isArray(rawInstructions)) {
          for (const inst of rawInstructions) {
            if (typeof inst === 'string') instructions.push(inst);
            else if (inst.text) instructions.push(inst.text);
            else if (inst.name) instructions.push(inst.name);
          }
        } else if (typeof rawInstructions === 'string') {
          instructions = [rawInstructions];
        }

        let image = data.image;
        if (Array.isArray(image)) image = image[0];
        if (typeof image === 'object' && image) image = image.url || image['@id'] || null;

        let servings = data.recipeYield;
        if (Array.isArray(servings)) servings = servings[0];

        return {
          title: data.name || 'Unknown Recipe',
          ingredients,
          instructions,
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
