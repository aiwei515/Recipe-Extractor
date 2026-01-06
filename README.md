# Recipe Extractor

Extract recipes from any website or video (YouTube, TikTok, Instagram) — no ads, no stories, just ingredients and instructions.

![Recipe Extractor](https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&h=400&fit=crop)

## Features

- 🔗 **Website Extraction** - Paste any recipe URL and get clean, formatted recipes
- 📹 **Video Support** - Extract recipes from YouTube, TikTok, and Instagram videos
- 🤖 **AI-Powered** - Uses GPT-4 to parse video transcripts into structured recipes
- 💾 **Save Recipes** - Create an account to build your personal recipe collection
- ✨ **Clean Interface** - Beautiful, distraction-free reading experience

## Prerequisites

Before you begin, you need to install:

### 1. Python 3.10+
Download from: https://www.python.org/downloads/

After installing, verify in terminal:
```bash
python --version
```

### 2. Node.js 18+
Download from: https://nodejs.org/

After installing, verify in terminal:
```bash
node --version
npm --version
```

### 3. OpenAI API Key (for video extraction)
Get one at: https://platform.openai.com/api-keys

## Setup

### Backend Setup

1. Navigate to the backend folder:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
```

3. Activate the virtual environment:

**Windows:**
```bash
venv\Scripts\activate
```

**Mac/Linux:**
```bash
source venv/bin/activate
```

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Create a `.env` file in the backend folder with your settings:
```
OPENAI_API_KEY=your_openai_api_key_here
SECRET_KEY=your_random_secret_key_here
```

6. Start the backend server:
```bash
python main.py
```

The API will be running at http://localhost:8000

### Frontend Setup

1. Open a new terminal and navigate to the frontend folder:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The app will be running at http://localhost:5173

## Usage

1. Open http://localhost:5173 in your browser
2. Paste a recipe URL (website or video)
3. Click "Extract" and wait for the magic ✨
4. Create an account to save your favorite recipes

## Supported Sources

### Websites
- AllRecipes, Food Network, Bon Appétit
- Most recipe blogs with structured data
- Any site using JSON-LD recipe markup

### Videos
- YouTube (with captions/transcripts)
- TikTok
- Instagram Reels

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLite** - Database for user data and saved recipes
- **recipe-scrapers** - Extract recipes from websites
- **youtube-transcript-api** - Get YouTube transcripts
- **yt-dlp** - Video info extraction
- **OpenAI GPT-4** - Parse video content into recipes

### Frontend
- **React** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Lucide React** - Icons

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/extract` | Extract recipe from URL |
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/recipes` | Get saved recipes |
| POST | `/api/recipes/save` | Save a recipe |
| DELETE | `/api/recipes/{id}` | Delete a recipe |

## Troubleshooting

**"No transcript available" for videos:**
- The video may not have captions enabled
- Try a different video with captions

**Recipe extraction fails:**
- Some websites block scraping
- Try the "View Original" link as fallback

**Video extraction is slow:**
- AI processing takes time for long videos
- Shorter videos extract faster

## License

MIT License - feel free to use and modify!
