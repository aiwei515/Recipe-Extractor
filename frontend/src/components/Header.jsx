import { Link } from 'react-router-dom';
import { ChefHat } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-sage-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-sage-500 rounded-xl flex items-center justify-center group-hover:bg-sage-600 transition-colors">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-sage-800">Recipe Extractor</h1>
              <p className="text-xs text-sage-500">No fluff, just recipes</p>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
