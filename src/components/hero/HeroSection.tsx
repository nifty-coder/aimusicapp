import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Sparkles, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMusicLibrary } from "@/hooks/useMusicLibrary";
import { useToast } from "@/hooks/use-toast";

export function HeroSection() {
  const [url, setUrl] = useState("");
  const { addMusicUrl, isLoading } = useMusicLibrary();
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!url.trim() || !isValidYouTubeUrl(url)) return;
    
    try {
      await addMusicUrl(url);
      setUrl("");
      toast({
        title: "Analysis Complete",
        description: "Your music has been analyzed and added to the library.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to analyze the music. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isValidYouTubeUrl = (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full text-center space-y-8">
        {/* Header */}
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 rounded-full bg-gradient-primary">
              <Music className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Music AI Analyzer
            </h1>
          </div>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Transform any YouTube music video into isolated audio layers. 
            Separate bass, drums, vocals, and instruments with AI precision.
          </p>
        </div>

        {/* Input Section */}
        <div className="space-y-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-primary rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
              
              <div className="relative bg-card/80 backdrop-blur-glass border border-border/50 rounded-2xl p-6 shadow-card">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      type="url"
                      placeholder="Paste YouTube URL here..."
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className={cn(
                        "h-14 text-lg bg-background/50 border-border/30 rounded-xl",
                        "focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
                        "placeholder:text-muted-foreground/70"
                      )}
                      disabled={isLoading}
                    />
                  </div>
                  
                  <Button
                    onClick={handleAnalyze}
                    disabled={!isValidYouTubeUrl(url) || isLoading}
                    size="lg"
                    className={cn(
                      "h-14 px-8 bg-gradient-primary hover:opacity-90",
                      "text-primary-foreground font-semibold rounded-xl",
                      "shadow-glow hover:shadow-xl transition-all duration-300",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      isLoading && "animate-pulse"
                    )}
                  >
                    {isLoading ? (
                      <>
                        <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        Analyze Music
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Status Message */}
            {url && (
              <div className="text-sm text-center animate-fade-in">
                {isValidYouTubeUrl(url) ? (
                  <span className="text-primary flex items-center justify-center gap-2">
                    <Music className="w-4 h-4" />
                    Valid YouTube URL detected
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Please enter a valid YouTube URL
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-16 animate-slide-up" style={{ animationDelay: "0.4s" }}>
          {[
            {
              icon: Volume2,
              title: "Bass Extraction",
              description: "Isolate low-frequency bass lines and sub-bass elements"
            },
            {
              icon: Music,
              title: "Instrument Separation",
              description: "Extract individual instruments including piano, guitar, and strings"
            },
            {
              icon: Sparkles,
              title: "AI-Powered Analysis",
              description: "Advanced machine learning for precise audio separation"
            }
          ].map((feature, index) => (
            <div
              key={index}
              className="p-6 bg-card/50 backdrop-blur-sm border border-border/30 rounded-xl hover:bg-card/70 transition-all duration-300 group"
            >
              <div className="p-3 rounded-lg bg-gradient-secondary w-fit mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Import the Volume2 icon
import { Volume2 } from "lucide-react";