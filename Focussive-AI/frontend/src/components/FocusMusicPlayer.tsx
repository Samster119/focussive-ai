'use client';

import { useState, useRef, useEffect } from 'react';

const TRACKS = [
  { id: 'lofi', name: 'Deep Focus (Lofi)', icon: 'headphones', url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3' },
  { id: 'rain', name: 'Rain', icon: 'water_drop', url: 'https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3' },
  { id: 'white_noise', name: 'White Noise', icon: 'waves', url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_274eef7527.mp3' },
  { id: 'nature', name: 'Nature', icon: 'forest', url: 'https://cdn.pixabay.com/audio/2021/09/06/audio_245230da37.mp3' },
];

export default function FocusMusicPlayer() {
  const [activeTrack, setActiveTrack] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
    }
    
    if (activeTrack) {
      const track = TRACKS.find(t => t.id === activeTrack);
      if (track && audioRef.current.src !== track.url) {
        audioRef.current.src = track.url;
        if (isPlaying) {
          audioRef.current.play().catch(e => console.warn('Audio play failed:', e));
        }
      }
    } else {
      audioRef.current.pause();
    }
  }, [activeTrack, isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  function togglePlay(trackId: string) {
    if (activeTrack === trackId) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play().catch(e => console.warn('Audio play failed:', e));
        setIsPlaying(true);
      }
    } else {
      setActiveTrack(trackId);
      setIsPlaying(true);
    }
  }

  return (
    <div className="bg-surface-container-lowest p-lg rounded-xl card-shadow mt-lg">
      <div className="flex justify-between items-center mb-md">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary">music_note</span>
          <h3 className="font-title-sm text-on-surface">Focus Music</h3>
        </div>
        
        {activeTrack && (
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-on-surface-variant text-sm">volume_down</span>
            <input 
              type="range" 
              min="0" max="1" step="0.05" 
              value={volume} 
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-24 accent-primary"
            />
            <span className="material-symbols-outlined text-on-surface-variant text-sm">volume_up</span>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
        {TRACKS.map(track => {
          const isActive = activeTrack === track.id;
          return (
            <button
              key={track.id}
              onClick={() => togglePlay(track.id)}
              className={`p-md rounded-xl flex flex-col items-center gap-sm transition-all border ${
                isActive 
                  ? 'border-primary bg-primary/5 text-primary' 
                  : 'border-transparent bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <span className="material-symbols-outlined text-3xl">
                {isActive && isPlaying ? 'pause_circle' : 'play_circle'}
              </span>
              <span className="font-label-caps">{track.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  );
}
