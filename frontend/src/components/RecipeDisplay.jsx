import { useState } from 'react';
import { 
  Clock, 
  Users, 
  ExternalLink, 
  Check, 
  ChefHat,
  Youtube,
  Globe,
  Lightbulb
} from 'lucide-react';

export default function RecipeDisplay({ recipe }) {
  const [checkedIngredients, setCheckedIngredients] = useState(new Set());

  const toggleIngredient = (index) => {
    const newChecked = new Set(checkedIngredients);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedIngredients(newChecked);
  };

  const getPlatformIcon = () => {
    if (recipe.source_type === 'video') {
      if (recipe.platform === 'youtube') return <Youtube className="w-4 h-4" />;
      return <ChefHat className="w-4 h-4" />;
    }
    return <Globe className="w-4 h-4" />;
  };

  const defaultImage = "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&h=400&fit=crop";

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden mb-8">
        <img 
          src={recipe.image_url || defaultImage}
          alt={recipe.title}
          className="w-full h-full object-cover"
          onError={(e) => { e.target.src = defaultImage }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm text-white">
              {getPlatformIcon()}
              {recipe.source_type === 'video' ? recipe.platform || 'Video' : 'Website'}
            </span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">
            {recipe.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-white/90">
            {recipe.prep_time && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Prep: {recipe.prep_time}</span>
              </div>
            )}
            {recipe.cook_time && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Cook: {recipe.cook_time}</span>
              </div>
            )}
            {recipe.servings && (
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span className="text-sm">{recipe.servings}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <a 
          href={recipe.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-sage-100 text-sage-700 rounded-lg hover:bg-sage-200 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          View Original
        </a>
      </div>

      {/* Content Grid */}
      <div className="grid md:grid-cols-3 gap-8">
        {/* Ingredients */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-2xl p-6 shadow-md border border-sage-100 sticky top-24">
            <h2 className="font-display text-2xl font-bold text-sage-800 mb-4">
              Ingredients
            </h2>
            <p className="text-sm text-sage-500 mb-4">
              Click to check off as you go
            </p>
            <ul className="space-y-3">
              {recipe.ingredients?.map((ingredient, index) => (
                <li 
                  key={index}
                  onClick={() => toggleIngredient(index)}
                  className={`cursor-pointer p-3 rounded-lg transition-all ${
                    checkedIngredients.has(index)
                      ? 'bg-sage-100 text-sage-500 line-through'
                      : 'bg-sage-50 hover:bg-sage-100 text-sage-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                      checkedIngredients.has(index)
                        ? 'bg-sage-500 border-sage-500'
                        : 'border-sage-300'
                    }`}>
                      {checkedIngredients.has(index) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span className="text-sm">{ingredient}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Instructions */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl p-6 shadow-md border border-sage-100">
            <h2 className="font-display text-2xl font-bold text-sage-800 mb-6">
              Instructions
            </h2>
            <ol className="space-y-6">
              {recipe.instructions?.map((instruction, index) => (
                <li key={index} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-terracotta-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <p className="text-sage-700 leading-relaxed pt-1">
                    {instruction}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          {/* Tips Section */}
          {recipe.tips && recipe.tips.length > 0 && (
            <div className="mt-6 bg-amber-50 rounded-2xl p-6 border border-amber-200">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-amber-600" />
                <h3 className="font-display text-xl font-bold text-amber-800">
                  Tips & Notes
                </h3>
              </div>
              <ul className="space-y-2">
                {recipe.tips.map((tip, index) => (
                  <li key={index} className="text-amber-800 text-sm flex items-start gap-2">
                    <span className="text-amber-500">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
