import { Clock, Users, ExternalLink, Trash2 } from 'lucide-react';

export default function RecipeCard({ recipe, onDelete, showDelete = false }) {
  const defaultImage = "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400&h=300&fit=crop";

  return (
    <div className="recipe-card bg-white rounded-2xl overflow-hidden shadow-md border border-sage-100">
      <div className="relative h-48 overflow-hidden">
        <img 
          src={recipe.image_url || defaultImage}
          alt={recipe.title}
          className="w-full h-full object-cover"
          onError={(e) => { e.target.src = defaultImage }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="font-display text-lg font-semibold text-white line-clamp-2">
            {recipe.title}
          </h3>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex flex-wrap gap-3 mb-3">
          {recipe.prep_time && (
            <div className="flex items-center gap-1 text-sm text-sage-600">
              <Clock className="w-4 h-4" />
              <span>{recipe.prep_time}</span>
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center gap-1 text-sm text-sage-600">
              <Users className="w-4 h-4" />
              <span>{recipe.servings}</span>
            </div>
          )}
        </div>

        <p className="text-sm text-sage-500 mb-3">
          {recipe.ingredients?.length || 0} ingredients • {recipe.instructions?.length || 0} steps
        </p>

        <div className="flex items-center justify-between">
          <a 
            href={recipe.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-sage-500 hover:text-sage-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Source</span>
          </a>
          
          {showDelete && onDelete && (
            <button
              onClick={() => onDelete(recipe.id)}
              className="p-2 text-sage-400 hover:text-terracotta-500 hover:bg-terracotta-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
