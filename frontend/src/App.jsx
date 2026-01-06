import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-cream">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </main>
        <footer className="py-8 text-center text-sage-400 text-sm">
          <p>Built with ❤️ for home cooks everywhere</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
