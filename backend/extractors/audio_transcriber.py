import os
import tempfile
from typing import Optional
from openai import OpenAI
import yt_dlp
from config import OPENAI_API_KEY

client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


def download_audio(url: str) -> Optional[str]:
    """Download audio from a video URL and return the file path."""
    try:
        # Create a temp file for the audio
        temp_dir = tempfile.gettempdir()
        output_path = os.path.join(temp_dir, 'recipe_audio.%(ext)s')
        final_path = os.path.join(temp_dir, 'recipe_audio')
        
        # Try to download audio without FFmpeg post-processing
        ydl_opts = {
            'format': 'bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio[ext=webm]/bestaudio/best',
            'outtmpl': output_path,
            'quiet': True,
            'no_warnings': True,
            # Don't use FFmpeg post-processors
            'postprocessors': [],
            'prefer_ffmpeg': False,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            
            # Get the actual downloaded file path
            if info and 'requested_downloads' in info:
                downloaded_file = info['requested_downloads'][0].get('filepath')
                if downloaded_file and os.path.exists(downloaded_file):
                    return downloaded_file
            
            # Try to find the file with common extensions
            for ext in ['.m4a', '.mp3', '.webm', '.mp4', '.opus', '.ogg', '.wav']:
                test_path = final_path + ext
                if os.path.exists(test_path):
                    return test_path
                    
        return None
        
    except Exception as e:
        print(f"Audio download error: {e}")
        return None


def transcribe_audio(audio_path: str) -> Optional[str]:
    """Transcribe audio file using OpenAI Whisper API."""
    if not client:
        print("OpenAI client not configured")
        return None
    
    # Check file size - Whisper has a 25MB limit
    file_size = os.path.getsize(audio_path)
    if file_size > 25 * 1024 * 1024:
        print(f"Audio file too large: {file_size / (1024*1024):.1f}MB (max 25MB)")
        return None
        
    try:
        with open(audio_path, 'rb') as audio_file:
            # Use Whisper API for transcription
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="text"
            )
        return transcript
        
    except Exception as e:
        print(f"Transcription error: {e}")
        return None
    finally:
        # Clean up the audio file
        try:
            if os.path.exists(audio_path):
                os.remove(audio_path)
        except:
            pass


def transcribe_video(url: str) -> Optional[str]:
    """Download and transcribe audio from a video URL."""
    print(f"Downloading audio from: {url}")
    audio_path = download_audio(url)
    
    if not audio_path:
        print("Failed to download audio")
        return None
    
    print(f"Transcribing audio: {audio_path}")
    transcript = transcribe_audio(audio_path)
    
    if transcript:
        print(f"Transcription successful: {len(transcript)} characters")
    
    return transcript
