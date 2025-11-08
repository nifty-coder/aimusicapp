import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronRight, Music, Volume2, Piano, Drum, Zap, Mic, Music2, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMusicLibrary } from "@/hooks/useMusicLibrary";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const iconMap = {
  Volume2,
  Drum,
  Mic,
  Piano,
  Music, 
  Zap,
  Music2
};

interface MusicSidebarProps {
  onUrlSelect?: (url: string) => void;
}

export function MusicSidebar({ onUrlSelect }: MusicSidebarProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [downloadControllers, setDownloadControllers] = useState<Record<string, AbortController | null>>({});
  const [availableFiles, setAvailableFiles] = useState<Record<string, Set<string>>>({});
  const [titleOverrides, setTitleOverrides] = useState<Record<string, string>>({});
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { urls, removeMusicUrl, clearLibrary, updateMusicTitle, scheduleRemoveMusicUrl, undoRemoveMusicUrl, scheduleClearLibrary, undoClearLibrary } = useMusicLibrary();
  const { toast } = useToast();

  // Auto-refresh caches when library changes
  useEffect(() => {
    setAvailableFiles({});
    setTitleOverrides({});
    setDownloading({});
  }, [urls]);

  const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // Helper: find a specific file entry in a JSZip archive and return a Blob
  const findEntryInZip = async (zipBlob: Blob, filename: string): Promise<Blob | null> => {
    // @ts-ignore
    const JSZipModule = await import('jszip');
    // @ts-ignore
    const JSZip = (JSZipModule as any).default || JSZipModule;
    const zip = await JSZip.loadAsync(zipBlob);
    let entry = zip.files[filename] || null;
    if (!entry) {
      const keys = Object.keys(zip.files);
      const found = keys.find(k => k.endsWith(filename));
      if (found) entry = zip.files[found];
    }
    if (!entry) return null;
    const fileData = await entry.async('blob');
    return fileData;
  };

  // Helper: Play or stop a file preview
  const handlePlayToggle = async (e: any, key: string, f: any, musicUrl: any) => {
    e.stopPropagation();
    try {
      if (playingKey === key) {
        audioRef.current?.pause();
        audioRef.current = null;
        setPlayingKey(null);
        if (playingUrl) {
          URL.revokeObjectURL(playingUrl);
          setPlayingUrl(null);
        }
        return;
      }

      // stop previous
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (playingUrl) {
        URL.revokeObjectURL(playingUrl);
        setPlayingUrl(null);
      }

      let srcUrl: string | null = null;
      if (f.blobUrl) {
        srcUrl = f.blobUrl;
      } else {
        // fetch ZIP and extract
        let zipBlob: Blob | null = null;
        if (musicUrl.cacheKey) {
          const res = await fetch(`${apiBase}/cache/${musicUrl.cacheKey}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          zipBlob = await res.blob();
        } else if (musicUrl.url && musicUrl.url.startsWith('http')) {
          const res = await fetch(`${apiBase}/youtube`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ youtube_url: musicUrl.url }) });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          zipBlob = await res.blob();
        }
        if (!zipBlob) throw new Error('No ZIP available');
        const fileData = await findEntryInZip(zipBlob, f.filename);
        if (!fileData) throw new Error('File not found in ZIP');
        srcUrl = URL.createObjectURL(fileData);
        setPlayingUrl(srcUrl);
      }

      if (!srcUrl) throw new Error('No playable source');
      const audio = new Audio(srcUrl);
      audioRef.current = audio;
      audio.onended = () => {
        setPlayingKey(null);
        audioRef.current = null;
        if (playingUrl) {
          URL.revokeObjectURL(playingUrl);
          setPlayingUrl(null);
        }
      };
      await audio.play();
      setPlayingKey(key);
    } catch (err: any) {
      toast({ title: 'Playback failed', description: err?.message || String(err), variant: 'destructive' });
    }
  };

  // Helper: download a file (from blobUrl or by extracting from remote ZIP)
  const handleDownload = async (e: any, key: string, f: any, musicUrl: any) => {
    e.stopPropagation();
    if (downloading[key]) return;
    const controller = new AbortController();
    setDownloadControllers(prev => ({ ...prev, [key]: controller }));
    setDownloading(prev => ({ ...prev, [key]: true }));
    try {
      if (f.blobUrl) {
        const a = document.createElement('a');
        a.href = f.blobUrl;
        a.download = f.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        // Prefer cached ZIP for uploaded files when cacheKey is present
        let zipBlob: Blob | null = null;
        if (musicUrl.cacheKey) {
          const res = await fetch(`${apiBase}/cache/${musicUrl.cacheKey}`, {
            method: 'GET',
            signal: controller.signal
          });
          if (!res.ok) {
            let detail = `HTTP ${res.status}`;
            try { const json = await res.json(); detail = json.detail || json.message || JSON.stringify(json); } catch {};
            throw new Error(detail);
          }
          zipBlob = await res.blob();
        } else if (musicUrl.url && musicUrl.url.startsWith('http')) {
          const res = await fetch(`${apiBase}/youtube`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ youtube_url: musicUrl.url }),
            signal: controller.signal
          });
          if (!res.ok) {
            let detail = `HTTP ${res.status}`;
            try { const json = await res.json(); detail = json.detail || json.message || JSON.stringify(json); } catch {};
            throw new Error(detail);
          }
          zipBlob = await res.blob();
        } else {
          throw new Error('Original uploaded file not available for re-download in this session.');
        }

        if (!zipBlob) throw new Error('No ZIP archive available');
        const fileData = await findEntryInZip(zipBlob, f.filename);
        if (!fileData) throw new Error('File not found inside archive');
        const url = URL.createObjectURL(fileData);
        const a = document.createElement('a');
        a.href = url;
        a.download = f.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
    } catch (err: any) {
      if (err && err.name === 'AbortError') {
        toast({ title: 'Download cancelled', description: 'The download was stopped.', variant: 'default' });
      } else {
        toast({ title: 'Download failed', description: err?.message || String(err), variant: 'destructive' });
      }
    } finally {
      setDownloading(prev => ({ ...prev, [key]: false }));
      setDownloadControllers(prev => ({ ...prev, [key]: null }));
    }
  };

  // When expanding a YouTube item, fetch the extracted file listing from backend
  // const ensureAvailableFiles = async (musicUrlId: string, musicUrl: any) => {
  //   if (!musicUrl.url || !musicUrl.url.startsWith('http')) return;
  //   if (availableFiles[musicUrlId]) return; // already fetched
  //   try {
  //     const res = await fetch(`${apiBase}/youtube/extracted`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ youtube_url: musicUrl.url })
  //     });
  //     if (!res.ok) {
  //       // ignore failure; we won't filter files in that case
  //       return;
  //     }
  //     const json = await res.json();
  //     // If backend provided a title header on prior /youtube request we may get it later
  //     const titleHeader = res.headers.get('X-Video-Title');
  //     if (titleHeader) {
  //       setTitleOverrides(prev => ({ ...prev, [musicUrlId]: titleHeader }));
  //       // Also update the stored MusicUrl title so it persists
  //       try {
  //         updateMusicTitle(musicUrlId, titleHeader);
  //       } catch (e) {
  //         // ignore
  //       }
  //     }
  //     const names = new Set<string>();
  //     if (Array.isArray(json.extracted_files)) {
  //       for (const f of json.extracted_files) {
  //         if (f && f.filename) {
  //           // skip directory-like entries
  //           if (f.filename.startsWith('audio/') || f.filename.endsWith('/')) continue;
  //           names.add(f.filename);
  //         }
  //       }
  //     }
  //     setAvailableFiles(prev => ({ ...prev, [musicUrlId]: names }));
  //   } catch (err) {
  //     // ignore and don't block UI
  //     console.warn('Failed to fetch extracted listing', err);
  //   }
  // };

  return (
    <div className="w-80 md:w-80 h-full md:h-screen bg-card border-r border-border/50 flex flex-col overflow-hidden">
      {/* Header */}
  <div className="p-4 md:p-6 border-b border-border/50 bg-gradient-secondary flex items-start justify-between">
          <div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Music Library</h2>
          <p className="hidden md:block text-sm text-muted-foreground">{urls.length} tracks analyzed</p>
        </div>
        <div>
          {urls.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => {
                // schedule clear with undo
                try {
                  scheduleClearLibrary();
                  toast({
                    title: 'Library cleared',
                    description: 'All items removed. Undo?',
                    action: (
                      <button
                        className="text-sm underline"
                        onClick={() => undoClearLibrary()}
                      >
                        Undo
                      </button>
                    )
                  });
                } catch (err: any) {
                  toast({ title: 'Error', description: err?.message || 'Failed to clear library', variant: 'destructive' });
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* URL List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">
          {urls.length === 0 ? null : (
            urls.map((musicUrl, idx) => {
              const isExpanded = expandedItems.has(musicUrl.id);
              
              return (
                <div
                  key={musicUrl.id}
                  className={cn(
                    // softened visuals
                    "bg-muted/10 rounded-xl border border-border/10 overflow-hidden transition-all duration-300",
                    "animate-fade-in"
                  )}
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  {/* URL Header */}
                  <button
                    onClick={() => {
                      toggleExpanded(musicUrl.id);
                    }}
                    className="w-full p-3 text-left flex items-center gap-3 hover:bg-muted/10 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-primary" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground text-sm">
                          {titleOverrides[musicUrl.id] || musicUrl.title}
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {musicUrl.addedAt.toLocaleDateString()}
                      </p>
                    </div>
                    
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        try {
                          scheduleRemoveMusicUrl(musicUrl.id);
                          toast({
                            title: 'Item deleted',
                            description: 'The item has been removed. Undo?',
                            action: (
                              <button
                                className="text-sm underline"
                                onClick={() => {
                                  undoRemoveMusicUrl(musicUrl.id);
                                }}
                              >
                                Undo
                              </button>
                            )
                          });
                        } catch (err: any) {
                          toast({ title: 'Error', description: err?.message || 'Failed to delete item', variant: 'destructive' });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          const ev = e as React.KeyboardEvent<HTMLSpanElement>;
                          ev.currentTarget.click?.();
                        }
                      }}
                      className="p-1 hover:bg-destructive/20 rounded transition-colors inline-flex items-center"
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </span>
                  </button>

                  {/* Layers Dropdown */}
                  {isExpanded && (
                    <div className="border-t border-border/20 bg-card/0 animate-slide-up">
                      <div className="p-2 space-y-2">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                          Audio Layers
                        </h4>
                        
                        {musicUrl.layers.map((layer) => {
                          const IconComponent = iconMap[layer.icon as keyof typeof iconMap] || Music;
                          // normalize volumes so displayed percentages sum to 100
                          const total = musicUrl.layers.reduce((s, l) => s + (l.volume || 0), 0) || 1;
                          const normalized = Math.round(((layer.volume || 0) / total) * 100);

                          return (
                            <div
                              key={layer.id}
                              className={cn(
                                "flex items-center gap-3 p-2 rounded-lg transition-all duration-200",
                                "bg-background/0 hover:bg-background/5 border border-border/10"
                              )}
                            >
                              <IconComponent className="w-4 h-4 text-primary flex-shrink-0" />
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-foreground">
                                    {layer.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {normalized}%
                                  </span>
                                </div>
                                
                                {/* Volume Bar */}
                                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-primary transition-all duration-300"
                                    style={{ width: `${normalized}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {/* extracted files list (downloadable) */}
                        {musicUrl.files && musicUrl.files.length > 0 && (
                          <div className="mt-3">
                            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Extracted Files</h5>
                            <div className="space-y-2">
                              {(
                                (availableFiles[musicUrl.id]
                                  ? musicUrl.files.filter((f) => availableFiles[musicUrl.id].has(f.filename))
                                  : musicUrl.files)
                                .filter(f => !f.filename.endsWith('/'))
                              ).map((f) => {
                                const key = `${musicUrl.id}__${f.filename}`;
                                const isDownloading = !!downloading[key];
                                return (
                                  <div key={key} className="flex items-center justify-between p-2 bg-background/50 rounded">
                                    <span className="text-sm truncate">{f.filename}</span>
                                    <div className="flex items-center gap-2">
                                      {!isDownloading ? (
                                        <div className="flex items-center gap-2">
                                          <button
                                            className="text-sm text-primary hover:underline flex items-center gap-2"
                                            onClick={(e) => handlePlayToggle(e, key, f, musicUrl)}
                                          >
                                            {playingKey === key ? 'Stop' : 'Play'}
                                          </button>
                                          
                                          {/* existing download button follows */}
                                          <button
                                            className="text-sm text-primary hover:underline flex items-center gap-2"
                                            onClick={(e) => handleDownload(e, key, f, musicUrl)}
                                          >
                                            Download
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                          <button
                                            className="text-xs text-destructive underline"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const ctrl = downloadControllers[key];
                                              if (ctrl) ctrl.abort();
                                              setDownloading(prev => ({ ...prev, [key]: false }));
                                              setDownloadControllers(prev => ({ ...prev, [key]: null }));
                                            }}
                                          >
                                            Stop
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}