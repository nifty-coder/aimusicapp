import { useState } from "react";
import { ChevronDown, ChevronRight, Music, Volume2, Piano, Drum, Zap, Mic, Music2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMusicLibrary } from "@/hooks/useMusicLibrary";

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
  const { urls, removeMusicUrl } = useMusicLibrary();

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="w-80 h-screen bg-card border-r border-border/50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border/50 bg-gradient-secondary">
        <h2 className="text-xl font-semibold text-foreground mb-2">Music Library</h2>
        <p className="text-sm text-muted-foreground">
          {urls.length} tracks analyzed
        </p>
      </div>

      {/* URL List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">
          {urls.length === 0 ? (
            <div className="text-center py-8">
              <Music className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No tracks analyzed yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add a YouTube URL to get started</p>
            </div>
          ) : (
            urls.map((musicUrl) => {
              const isExpanded = expandedItems.has(musicUrl.id);
              
              return (
                <div
                  key={musicUrl.id}
                  className="bg-muted/30 rounded-xl border border-border/30 overflow-hidden backdrop-blur-sm transition-all duration-300 hover:bg-muted/50"
                >
                  {/* URL Header */}
                  <button
                    onClick={() => toggleExpanded(musicUrl.id)}
                    className="w-full p-4 text-left flex items-center gap-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-primary" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-foreground text-sm truncate">
                        {musicUrl.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {musicUrl.addedAt.toLocaleDateString()}
                      </p>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMusicUrl(musicUrl.id);
                      }}
                      className="p-1 hover:bg-destructive/20 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  </button>

                  {/* Layers Dropdown */}
                  {isExpanded && (
                    <div className="border-t border-border/30 bg-card/50">
                      <div className="p-3 space-y-2">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                          Audio Layers
                        </h4>
                        
                        {musicUrl.layers.map((layer) => {
                          const IconComponent = iconMap[layer.icon as keyof typeof iconMap] || Music;
                          
                          return (
                            <div
                              key={layer.id}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-lg transition-all duration-200",
                                "bg-background/50 hover:bg-background/80 border border-border/20"
                              )}
                            >
                              <IconComponent className="w-4 h-4 text-primary flex-shrink-0" />
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-foreground">
                                    {layer.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {layer.volume}%
                                  </span>
                                </div>
                                
                                {/* Volume Bar */}
                                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-primary transition-all duration-300"
                                    style={{ width: `${layer.volume}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
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