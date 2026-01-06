import re
import json
from typing import Optional, Dict, Any
import yt_dlp
import requests


def extract_youtube_id(url: str) -> Optional[str]:
    """Extract YouTube video ID from URL."""
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})',
        r'youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def get_youtube_transcript(video_id: str) -> Optional[str]:
    """Get transcript from YouTube video using yt-dlp."""
    try:
        url = f"https://www.youtube.com/watch?v={video_id}"
        
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['en', 'en-US', 'en-GB'],
            'subtitlesformat': 'json3',
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # Try to get subtitles
            subtitles = info.get('subtitles', {})
            auto_captions = info.get('automatic_captions', {})
            
            # Look for English captions
            caption_url = None
            for lang in ['en', 'en-US', 'en-GB']:
                if lang in subtitles:
                    for fmt in subtitles[lang]:
                        if fmt.get('ext') == 'json3':
                            caption_url = fmt.get('url')
                            break
                if not caption_url and lang in auto_captions:
                    for fmt in auto_captions[lang]:
                        if fmt.get('ext') == 'json3':
                            caption_url = fmt.get('url')
                            break
                if caption_url:
                    break
            
            if caption_url:
                # Fetch and parse the captions
                response = requests.get(caption_url, timeout=10)
                if response.ok:
                    caption_data = response.json()
                    events = caption_data.get('events', [])
                    transcript_parts = []
                    for event in events:
                        segs = event.get('segs', [])
                        for seg in segs:
                            text = seg.get('utf8', '').strip()
                            if text and text != '\n':
                                transcript_parts.append(text)
                    return ' '.join(transcript_parts)
            
            return None
            
    except Exception as e:
        print(f"YouTube transcript error: {e}")
        return None


def get_video_info_yt_dlp(url: str) -> Dict[str, Any]:
    """Get video info using yt-dlp (works for YouTube, TikTok, Instagram, etc.)."""
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        'skip_download': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            result = {
                'title': info.get('title', ''),
                'description': info.get('description', ''),
                'thumbnail': info.get('thumbnail', ''),
                'duration': info.get('duration', 0),
                'platform': info.get('extractor', '').lower(),
            }
            
            return result
            
    except Exception as e:
        print(f"yt-dlp error: {e}")
        return {}


def extract_from_video(url: str) -> Optional[Dict[str, Any]]:
    """Extract video information and transcript."""
    try:
        # Check if it's YouTube
        youtube_id = extract_youtube_id(url)
        
        if youtube_id:
            # Get YouTube transcript (free, from captions)
            transcript = get_youtube_transcript(youtube_id)
            video_info = get_video_info_yt_dlp(url)
            
            # If no captions available, try audio transcription
            if not transcript:
                print("No YouTube captions found, trying audio transcription...")
                from extractors.audio_transcriber import transcribe_video
                transcript = transcribe_video(url)
            
            return {
                'title': video_info.get('title', ''),
                'description': video_info.get('description', ''),
                'thumbnail': video_info.get('thumbnail', ''),
                'transcript': transcript,
                'platform': 'youtube',
                'source_url': url
            }
        else:
            # Use yt-dlp for other platforms (TikTok, Instagram, etc.)
            video_info = get_video_info_yt_dlp(url)
            
            # For TikTok/Instagram, transcribe the audio since they don't have captions
            print(f"Transcribing {video_info.get('platform', 'video')} audio...")
            from extractors.audio_transcriber import transcribe_video
            transcript = transcribe_video(url)
            
            return {
                'title': video_info.get('title', ''),
                'description': video_info.get('description', ''),
                'thumbnail': video_info.get('thumbnail', ''),
                'transcript': transcript,
                'platform': video_info.get('platform', 'unknown'),
                'source_url': url
            }
            
    except Exception as e:
        print(f"Video extraction error: {e}")
        return None


def is_video_url(url: str) -> bool:
    """Check if URL is from a video platform."""
    video_patterns = [
        r'youtube\.com',
        r'youtu\.be',
        r'tiktok\.com',
        r'instagram\.com/reel',
        r'instagram\.com/p/',
        r'vimeo\.com',
    ]
    
    for pattern in video_patterns:
        if re.search(pattern, url, re.IGNORECASE):
            return True
    return False
