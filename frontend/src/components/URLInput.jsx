import { useState } from 'react';
import { Link2, Loader2, Sparkles } from 'lucide-react';

export default function URLInput({ onExtract, loading }) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim()) {
      onExtract(url.trim());
    }
  };

  const exampleUrls = [
    { label: 'AllRecipes', url: 'https://www.allrecipes.com/recipe/24059/classic-italian-tiramisu/' },
    { label: 'Food Network', url: 'https://www.foodnetwork.com/recipes/ina-garten/perfect-roast-chicken-recipe-1940592' },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sage-400" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a recipe URL from any website or video..."
            className="w-full pl-12 pr-36 py-4 bg-white border-2 border-sage-200 rounded-2xl text-sage-800 placeholder-sage-400 focus:border-sage-500 focus:ring-4 focus:ring-sage-100 transition-all text-lg"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-terracotta-500 text-white rounded-xl hover:bg-terracotta-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Extracting</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Extract</span>
              </>
            )}
          </button>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
        <span className="text-sage-500">Try:</span>
        {exampleUrls.map((example, i) => (
          <button
            key={i}
            onClick={() => setUrl(example.url)}
            className="px-3 py-1 bg-sage-100 text-sage-600 rounded-full hover:bg-sage-200 transition-colors"
          >
            {example.label}
          </button>
        ))}
      </div>

      <div className="mt-6 text-center text-sm text-sage-500">
        <p>
          Supports <span className="font-medium text-sage-600">recipe websites</span>, 
          {' '}<span className="font-medium text-sage-600">YouTube</span>, 
          {' '}<span className="font-medium text-sage-600">TikTok</span>, 
          {' '}and <span className="font-medium text-sage-600">Instagram</span> videos
        </p>
      </div>
    </div>
  );
}
