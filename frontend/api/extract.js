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

    // Check if it's a video URL
    const videoPatterns = [/youtube\.com/, /youtu\.be/, /tiktok\.com/, /instagram\.com\/reel/, /instagram\.com\/p\//];
    const isVideo = videoPatterns.some(pattern => pattern.test(url));

    if (isVideo) {
      return res.status(200).json({
        title: 'Video Recipe',
        ingredients: [],
        instructions: [],
        source_url: url,
        source_type: 'video',
        error: 'Video extraction is only available when running locally. Please use recipe website URLs on the hosted version.',
      });
    }

    // Fetch the recipe page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      return res.status(200).json({
        error: `Failed to fetch URL (status: ${response.status}). The site may be blocking requests.`
      });
    }

    const html = await response.text();

    if (html.length < 1000) {
      return res.status(200).json({
        title: '',
        ingredients: [],
        instructions: [],
        source_url: url,
        source_type: 'website',
        error: 'The website returned an empty response. Try running locally for better results.',
      });
    }

    const recipe = extractRecipeFromHtml(html, url);

    if (!recipe) {
      return res.status(200).json({
        title: '',
        ingredients: [],
        instructions: [],
        source_url: url,
        source_type: 'website',
        error: 'Could not find recipe data. The site may use a format we don\'t support, or try running locally.',
      });
    }

    return res.status(200).json(recipe);

  } catch (error) {
    return res.status(500).json({ error: error.message });
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
        if (Array.isArray(image)) image = image[0];
        if (typeof image === 'object' && image !== null) {
          image = image.url || image['@id'] || null;
        }

        let servings = data.recipeYield;
        if (Array.isArray(servings)) servings = servings[0];

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
