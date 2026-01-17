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

    // Check if it's a video URL
    const videoPatterns = [/youtube\.com/, /youtu\.be/, /tiktok\.com/, /instagram\.com\/reel/, /instagram\.com\/p\//];
    const isVideo = videoPatterns.some(pattern => pattern.test(url));

    if (isVideo) {
      return new Response(JSON.stringify({
        title: 'Video Recipe',
        ingredients: [],
        instructions: [],
        source_url: url,
        source_type: 'video',
        error: 'Video extraction requires running locally. Please use recipe website URLs on this hosted version.',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch the recipe page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch the URL' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const html = await response.text();

    // Extract JSON-LD recipe data
    const recipe = extractRecipeFromHtml(html, url);

    if (!recipe) {
      return new Response(JSON.stringify({
        title: '',
        ingredients: [],
        instructions: [],
        source_url: url,
        source_type: 'website',
        error: 'Could not find recipe data on this page. Try a different recipe URL.',
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
  // Find JSON-LD scripts
  const jsonLdRegex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      let data = JSON.parse(match[1]);

      // Handle @graph structure
      if (data['@graph']) {
        data = data['@graph'];
      }

      // Find recipe in array
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item['@type'] === 'Recipe' || item['@type'] === 'recipe') {
            data = item;
            break;
          }
        }
      }

      // Check if this is a recipe
      if (data['@type'] === 'Recipe' || data['@type'] === 'recipe') {
        const ingredients = data.recipeIngredient || [];
        const rawInstructions = data.recipeInstructions || [];

        // Parse instructions
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

        // Get image
        let image = data.image;
        if (Array.isArray(image)) {
          image = image[0];
        }
        if (typeof image === 'object' && image !== null) {
          image = image.url || image['@id'] || null;
        }

        // Get yield/servings
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
      // Continue to next script tag
      continue;
    }
  }

  return null;
}
