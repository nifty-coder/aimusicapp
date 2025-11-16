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
  // For uploaded audio files
  isLocalFile?: boolean;
  fileDataUrl?: string | null;
  // extracted files (filename + blobUrl)
  files?: { filename: string; blobUrl: string }[];
  // optional cache key returned by backend for uploads
  cacheKey?: string;
  // whether the entry finished processing and is available for download
  processed?: boolean;
}

const STORAGE_KEY = "music-analyzer-library";

export function useMusicLibrary() {
  const [urls, setUrls] = useState<MusicUrl[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const pendingDeletes = { current: new Map<string, { item: MusicUrl; timer: ReturnType<typeof setTimeout> }>() } as { current: Map<string, { item: MusicUrl; timer: ReturnType<typeof setTimeout> }> };
  const pendingClear = { current: null as null | { items: MusicUrl[]; timer: ReturnType<typeof setTimeout> } } as { current: null | { items: MusicUrl[]; timer: ReturnType<typeof setTimeout> } };

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
      try {
        const sanitized = urls.map(u => ({
          ...u,
          files: u.files ? u.files.map(f => ({ filename: f.filename })) : undefined
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      } catch (e) {
        // noop
      }
    }
  }, [urls]);

  const addMusicUrl = async (url: string): Promise<MusicUrl> => {
    setIsLoading(true);
    try {
      // Request backend to process YouTube and return ZIP
  const base = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
      const res = await fetch(`${base}/youtube`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtube_url: url })
      });

      if (!res.ok) {
        // Try to extract error detail from backend
        let detail = `HTTP ${res.status}`;
        try {
          const json = await res.json();
          detail = json.detail || json.message || json.error || JSON.stringify(json);
        } catch (e) {
          try {
            const text = await res.text();
            detail = text || detail;
          } catch {}
        }
        
        // Provide helpful error messages
        if (res.status === 500) {
          detail = `Backend server error: ${detail}\n\nMake sure your backend server is running and properly configured. Check backend logs for details.`;
        } else if (res.status === 404) {
          detail = `Endpoint not found: /youtube\n\nEnsure your backend server implements the /youtube endpoint.`;
        }
        
        throw new Error(detail);
      }

  const videoTitleHeader = res.headers.get('X-Video-Title');
  const blob = await res.blob();
    // dynamic import of jszip (ensure dependency installed)
    // @ts-ignore - allow dynamic import until types are available
    const JSZipModule = await import('jszip');
    // @ts-ignore - default export on some bundlers
    const JSZip = (JSZipModule as any).default || JSZipModule;
    // JSZip exposes a static `loadAsync` method
    const zip = await JSZip.loadAsync(blob);

      const files: { filename: string; blobUrl: string }[] = [];
      await Promise.all(Object.keys(zip.files).map(async (filename) => {
        // skip directory entries
        if (filename.endsWith('/')) return;
        const fileData = await zip.files[filename].async('blob');
        const blobUrl = URL.createObjectURL(fileData);
        files.push({ filename, blobUrl });
      }));

  // If backend provided a title header use it; otherwise try a lightweight
  // /youtube/extracted request which sometimes includes the title header.
  let finalTitle: string | null = videoTitleHeader ? videoTitleHeader.trim() : null;
  if (!finalTitle) {
    try {
      const res2 = await fetch(`${base}/youtube/extracted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtube_url: url })
      });
      if (res2 && res2.ok) {
        const header2 = res2.headers.get('X-Video-Title');
        if (header2) finalTitle = header2.trim();
      }
    } catch (e) {
      // ignore and fall back to local title
    }
  }

  const videoId = extractVideoId(url);
  const title = finalTitle || (await getMockTitle(url));

      const newMusicUrl: MusicUrl = {
        id: Date.now().toString(),
        url,
        title,
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        addedAt: new Date(),
        layers: normalizeLayers(generateMockLayers()),
        files,
        processed: true,
      };

      setUrls(prev => [newMusicUrl, ...prev]);
      return newMusicUrl;
    } finally {
      setIsLoading(false);
    }
  };

  const addAudioFile = async (file: File): Promise<MusicUrl> => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

  const base = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
      const res = await fetch(`${base}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const json = await res.json();
          detail = json.detail || json.message || json.error || JSON.stringify(json);
        } catch (e) {
          try {
            const text = await res.text();
            detail = text || detail;
          } catch {}
        }
        
        // Provide helpful error messages
        if (res.status === 500) {
          detail = `Backend server error: ${detail}\n\nMake sure your backend server is running and properly configured. Check backend logs for details.`;
        } else if (res.status === 404) {
          detail = `Endpoint not found: /upload\n\nEnsure your backend server implements the /upload endpoint.`;
        }
        
        throw new Error(detail);
      }

    const blob = await res.blob();
    // dynamic import of jszip (ensure dependency installed)
    // @ts-ignore - allow dynamic import until types are available
    const JSZipModule = await import('jszip');
    // @ts-ignore - default export on some bundlers
    const JSZip = (JSZipModule as any).default || JSZipModule;
    // JSZip exposes a static `loadAsync` method
    const zip = await JSZip.loadAsync(blob);

      const files: { filename: string; blobUrl: string }[] = [];
      await Promise.all(Object.keys(zip.files).map(async (filename) => {
        if (filename.endsWith('/')) return;
        const fileData = await zip.files[filename].async('blob');
        const blobUrl = URL.createObjectURL(fileData);
        files.push({ filename, blobUrl });
      }));

      const newMusicUrl: MusicUrl = {
        id: Date.now().toString(),
        url: `file:${file.name}`,
        title: file.name,
        thumbnail: '',
        addedAt: new Date(),
        layers: normalizeLayers(generateMockLayers()),
        isLocalFile: true,
        fileDataUrl: null,
        files,
        cacheKey: res.headers.get('X-Cache-Key') || undefined,
        processed: true,
      };

      setUrls(prev => [newMusicUrl, ...prev]);
      return newMusicUrl;
    } finally {
      setIsLoading(false);
    }
  };

  const removeMusicUrl = (id: string) => {
    // Update state and localStorage synchronously: compute new list,
    // revoke any in-memory blob URLs for the removed item to free resources,
    // then persist the sanitized remaining list or remove the storage key.
    setUrls(prev => {
      const remaining = prev.filter(url => url.id !== id);
      const removed = prev.find(url => url.id === id);
      // Revoke blob URLs from removed item
      try {
        if (removed && removed.files) {
          for (const f of removed.files) {
            try { if (f.blobUrl) URL.revokeObjectURL(f.blobUrl); } catch {};
          }
        }
      } catch {}

      // Persist remaining or clear storage
      try {
        if (remaining.length > 0) {
          const sanitized = remaining.map(u => ({
            ...u,
            files: u.files ? u.files.map(f => ({ filename: f.filename })) : undefined
          }));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {
        // noop
      }

      return remaining;
    });
  };

  const finalizeRemoveMusicUrl = (id: string) => {
    try {
      const entry = pendingDeletes.current.get(id);
      if (!entry) return;
      // Revoke blob URLs from removed item
      if (entry.item && entry.item.files) {
        for (const f of entry.item.files) {
          try { if (f.blobUrl) URL.revokeObjectURL(f.blobUrl); } catch {};
        }
      }
      pendingDeletes.current.delete(id);
    } catch (e) {
      // noop
    }
  };

  const scheduleRemoveMusicUrl = (id: string, ttl = 10000) => {
    const found = urls.find(u => u.id === id);
    if (!found) return;
    // Remove from visible list immediately
    setUrls(prev => {
      const remaining = prev.filter(u => u.id !== id);
      try {
        if (remaining.length > 0) {
          const sanitized = remaining.map(u => ({
            ...u,
            files: u.files ? u.files.map(f => ({ filename: f.filename })) : undefined
          }));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {}
      return remaining;
    });

    // store pending delete with timer
    const timer = setTimeout(() => finalizeRemoveMusicUrl(id), ttl);
    pendingDeletes.current.set(id, { item: found, timer });
  };

  const undoRemoveMusicUrl = (id: string) => {
    const entry = pendingDeletes.current.get(id);
    if (!entry) return;
    clearTimeout(entry.timer);
    pendingDeletes.current.delete(id);
    setUrls(prev => {
      const next = [entry.item, ...prev];
      try {
        const sanitized = next.map(u => ({
          ...u,
          files: u.files ? u.files.map(f => ({ filename: f.filename })) : undefined
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      } catch {}
      return next;
    });
  };

  const updateMusicTitle = (id: string, newTitle: string) => {
    setUrls(prev => prev.map(u => u.id === id ? { ...u, title: newTitle } : u));
  };

  const clearLibrary = () => {
    // Schedule clear with undo window: move all items into pendingClear
    try {
      const items = [...urls];
      setUrls([]);
      localStorage.removeItem(STORAGE_KEY);
      const timer = setTimeout(() => {
        // finalize: revoke any blob URLs
        try {
          for (const u of items) {
            if (u.files) {
              for (const f of u.files) {
                try { if (f.blobUrl) URL.revokeObjectURL(f.blobUrl); } catch {};
              }
            }
          }
        } catch {}
        pendingClear.current = null;
      }, 10000);
      pendingClear.current = { items, timer };
    } catch (e) {
      setUrls([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const undoClearLibrary = () => {
    if (!pendingClear.current) return;
    const { items, timer } = pendingClear.current;
    clearTimeout(timer);
    pendingClear.current = null;
    setUrls(items);
    try {
      const sanitized = items.map(u => ({ ...u, files: u.files ? u.files.map(f => ({ filename: f.filename })) : undefined }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    } catch {}
  };

  return {
    urls,
    isLoading,
    addMusicUrl,
    addAudioFile,
    removeMusicUrl,
    updateMusicTitle,
    scheduleRemoveMusicUrl,
    undoRemoveMusicUrl,
    scheduleClearLibrary: clearLibrary,
    undoClearLibrary,
    clearLibrary
  };
}

function normalizeLayers(layers: MusicLayer[]): MusicLayer[] {
  const total = layers.reduce((s, l) => s + (l.volume || 0), 0) || 1;
  return layers.map(l => ({ ...l, volume: Math.round(((l.volume || 0) / total) * 100) }));
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