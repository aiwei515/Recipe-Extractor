import { useState } from 'react';
import URLInput from '../components/URLInput';
import RecipeDisplay from '../components/RecipeDisplay';
import { ChefHat, Zap, Globe, Video } from 'lucide-react';

export default function Home() {
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleExtract = async (url) => {
    setLoading(true);
    setError(null);
    setRecipe(null);

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || 'Failed to extract recipe');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.ingredients?.length && !data.instructions?.length) {
        throw new Error('Could not find recipe data on this page');
      }

      setRecipe(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Instant Extraction',
      description: 'Get clean recipes in seconds, no more scrolling through life stories'
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: 'Works Everywhere',
      description: 'Supports AllRecipes, Food Network, Bon Appétit, and thousands more'
    },
    {
      icon: <Video className="w-6 h-6" />,
      title: 'Video Support',
      description: 'YouTube videos with captions work too! (Run locally for TikTok/Instagram)'
    }
  ];

  return (
    <div className="min-h-screen pattern-bg">
      {/* Hero Section */}
      {!recipe && (
        <section className="pt-16 pb-12 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-terracotta-100 text-terracotta-700 rounded-full text-sm font-medium mb-6">
              <ChefHat className="w-4 h-4" />
              Skip the fluff, get cooking
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold text-sage-900 mb-6 leading-tight">
              Extract Recipes from<br />
              <span className="text-terracotta-500">Any URL</span>
            </h1>
            <p className="text-lg md:text-xl text-sage-600 mb-12 max-w-2xl mx-auto">
              Paste any recipe link. We'll extract just the ingredients 
              and instructions — no ads, no stories, no scrolling.
            </p>
          </div>
        </section>
      )}

      {/* URL Input */}
      <section className={`px-4 ${recipe ? 'pt-8' : ''}`}>
        <URLInput onExtract={handleExtract} loading={loading} />
      </section>

      {/* Error Message */}
      {error && (
        <div className="max-w-3xl mx-auto mt-8 px-4">
          <div className="bg-terracotta-50 border border-terracotta-200 text-terracotta-700 px-6 py-4 rounded-xl">
            <p className="font-medium">Couldn't extract recipe</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="max-w-3xl mx-auto mt-12 px-4">
          <div className="bg-white rounded-2xl p-12 shadow-md border border-sage-100 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-sage-100 rounded-full mb-4 animate-pulse-soft">
              <ChefHat className="w-8 h-8 text-sage-500" />
            </div>
            <h3 className="font-display text-xl font-semibold text-sage-800 mb-2">
              Extracting your recipe<span className="loading-dots"></span>
            </h3>
            <p className="text-sage-500">
              This may take a moment
            </p>
          </div>
        </div>
      )}

      {/* Recipe Display */}
      {recipe && !loading && (
        <section className="max-w-5xl mx-auto mt-8 px-4 pb-12">
          <RecipeDisplay recipe={recipe} />
        </section>
      )}

      {/* Features Section */}
      {!recipe && !loading && (
        <section className="max-w-5xl mx-auto mt-20 px-4 pb-16">
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div 
                key={i}
                className="bg-white rounded-2xl p-6 shadow-md border border-sage-100 hover:shadow-lg transition-shadow"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="w-12 h-12 bg-sage-100 rounded-xl flex items-center justify-center text-sage-600 mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-display text-lg font-semibold text-sage-800 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sage-500 text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
