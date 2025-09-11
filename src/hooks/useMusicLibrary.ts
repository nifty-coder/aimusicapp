import { useState, useEffect } from "react";

export interface MusicLayer {
  id: string;
  name: string;
  icon: string;
  volume: number;
}

export interface MusicUrl {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  addedAt: Date;
  layers: MusicLayer[];
}

const STORAGE_KEY = "music-analyzer-library";

export function useMusicLibrary() {
  const [urls, setUrls] = useState<MusicUrl[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects
      const urlsWithDates = parsed.map((url: any) => ({
        ...url,
        addedAt: new Date(url.addedAt)
      }));
      setUrls(urlsWithDates);
    }
  }, []);

  // Save to localStorage whenever urls change
  useEffect(() => {
    if (urls.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(urls));
    }
  }, [urls]);

  const addMusicUrl = async (url: string): Promise<MusicUrl> => {
    setIsLoading(true);
    
    try {
      // Simulate API call to analyze the music
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Extract video ID and create mock data
      const videoId = extractVideoId(url);
      const title = await getMockTitle(url);
      
      const newMusicUrl: MusicUrl = {
        id: Date.now().toString(),
        url,
        title,
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        addedAt: new Date(),
        layers: generateMockLayers()
      };

      setUrls(prev => [newMusicUrl, ...prev]);
      return newMusicUrl;
    } finally {
      setIsLoading(false);
    }
  };

  const removeMusicUrl = (id: string) => {
    setUrls(prev => prev.filter(url => url.id !== id));
  };

  const clearLibrary = () => {
    setUrls([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    urls,
    isLoading,
    addMusicUrl,
    removeMusicUrl,
    clearLibrary
  };
}

function extractVideoId(url: string): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return match ? match[1] : "dQw4w9WgXcQ";
}

async function getMockTitle(url: string): Promise<string> {
  // In a real app, you'd fetch the actual video title
  const titles = [
    "Amazing Song - Artist Name",
    "Epic Music Video - Band Name",
    "Beautiful Melody - Composer",
    "Hit Single - Popular Artist",
    "Indie Track - Emerging Artist"
  ];
  return titles[Math.floor(Math.random() * titles.length)];
}

function generateMockLayers(): MusicLayer[] {
  const layerTypes = [
    { id: "bass", name: "Bass", icon: "Volume2" },
    { id: "drums", name: "Percussion", icon: "Drum" },
    { id: "vocals", name: "Vocals", icon: "Mic" },
    { id: "piano", name: "Piano", icon: "Piano" },
    { id: "guitar", name: "Guitar", icon: "Music" },
    { id: "synths", name: "Synths", icon: "Zap" },
    { id: "strings", name: "Strings", icon: "Music2" }
  ];

  // Randomly select 3-5 layers
  const numLayers = Math.floor(Math.random() * 3) + 3;
  const selectedLayers = layerTypes
    .sort(() => Math.random() - 0.5)
    .slice(0, numLayers);

  return selectedLayers.map(layer => ({
    ...layer,
    volume: Math.floor(Math.random() * 40) + 60 // 60-100%
  }));
}