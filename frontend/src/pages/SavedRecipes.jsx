import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RecipeCard from '../components/RecipeCard';
import { BookOpen, Plus, Loader2 } from 'lucide-react';

export default function SavedRecipes() {
  const { user, token, loading: authLoading } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (user && token) {
      fetchRecipes();
    }
  }, [user, token, authLoading]);

  const fetchRecipes = async () => {
    try {
      const response = await fetch('/api/recipes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRecipes(data);
      } else {
        throw new Error('Failed to fetch recipes');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (recipeId) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;

    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setRecipes(recipes.filter(r => r.id !== recipeId));
      } else {
        throw new Error('Failed to delete recipe');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center pattern-bg">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-sage-500 mx-auto mb-4" />
          <p className="text-sage-500">Loading your recipes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] pattern-bg">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-sage-900">
              My Recipes
            </h1>
            <p className="text-sage-500 mt-1">
              {recipes.length} saved recipe{recipes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-terracotta-500 text-white rounded-xl hover:bg-terracotta-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Extract New
          </Link>
        </div>

        {error && (
          <div className="bg-terracotta-50 border border-terracotta-200 text-terracotta-700 px-6 py-4 rounded-xl mb-8">
            {error}
          </div>
        )}

        {/* Recipes Grid */}
        {recipes.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe) => (
              <RecipeCard 
                key={recipe.id} 
                recipe={recipe} 
                onDelete={handleDelete}
                showDelete={true}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-sage-100 rounded-2xl mb-6">
              <BookOpen className="w-10 h-10 text-sage-400" />
            </div>
            <h2 className="font-display text-2xl font-semibold text-sage-800 mb-2">
              No saved recipes yet
            </h2>
            <p className="text-sage-500 mb-6 max-w-md mx-auto">
              Extract recipes from your favorite websites and videos, then save them here for easy access.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-sage-500 text-white rounded-xl hover:bg-sage-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Extract Your First Recipe
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
