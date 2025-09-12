import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Sparkles, Music, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMusicLibrary } from "@/hooks/useMusicLibrary";
import { useToast } from "@/hooks/use-toast";

export function HeroSection() {
  const [url, setUrl] = useState("");
  const { addMusicUrl, addAudioFile, isLoading } = useMusicLibrary();
  const { toast } = useToast();

  // Max upload size 10 MB
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadDone, setUploadDone] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (f.size > MAX_FILE_SIZE) {
      toast({ title: 'Error', description: 'File must be 10 MB or smaller', variant: 'destructive' });
      e.target.value = '';
      return;
    }

  // Show filename and a simulated progress while processing
  setUploadFileName(f.name);
  setUploadLoading(true);
  setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((p) => Math.min(90, Math.floor(p + Math.random() * 10 + 5)));
    }, 250);

    try {
      await addAudioFile(f);
      setUploadProgress(100);
      setUploadDone(true);
      toast({ title: 'Uploaded', description: 'Audio file analyzed and added to library.' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to process audio file', variant: 'destructive' });
    } finally {
      clearInterval(interval);
      // small delay so user sees 100%
      setTimeout(() => {
        setUploadLoading(false);
        setUploadProgress(0);
        setUploadFileName('');
      }, 600);
      e.target.value = '';
    }
  };

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
      const msg = error instanceof Error ? error.message : String(error);
      toast({
        title: "Error",
        description: `Failed to analyze the music: ${msg}`,
        variant: "destructive",
      });
    }

    window.location.reload();
  };

  const isValidYouTubeUrl = (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 md:p-8">
      <div className="max-w-3xl md:max-w-4xl w-full text-center space-y-8">
        {/* Header */}
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 rounded-full bg-gradient-primary">
              <Music className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-6xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Music AI Analyzer
            </h1>
          </div>
          
          <p className="text-base md:text-lg lg:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Transform any YouTube music video into isolated audio layers. 
            Separate bass, drums, vocals, and instruments with AI precision.
          </p>
        </div>

        {/* Input Section */}
        <div className="space-y-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-primary rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
              
              <div className="relative bg-card/80 backdrop-blur-glass border border-border/50 rounded-2xl p-4 md:p-6 shadow-card">
                <div className="flex flex-col md:flex-row gap-4 items-stretch">
                  <div className="flex-1 min-w-0">
                    <Input
                      type="url"
                      placeholder="Paste YouTube URL here..."
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className={cn(
                        "h-14 text-sm md:text-lg bg-background/50 border-border/30 rounded-xl",
                        "focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
                        "placeholder:text-muted-foreground/70"
                      )}
                      disabled={isLoading}
                    />
                  </div>
                    <div className="flex items-center gap-2">
                    {/* Upload control temporarily disabled */}
                    <input
                      type="file"
                      accept="audio/*"
                      id="audioUpload"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={true} /* temporarily disabled */
                    />
                    <label
                      // prevent label from triggering the hidden input while disabled
                      onClick={(e) => e.preventDefault()}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-medium opacity-60 cursor-not-allowed",
                        "bg-purple-500 text-white"
                      )}
                      aria-disabled={true}
                    >
                      <span className="flex items-center gap-2">
                        <span>Upload audio (temporarily disabled)</span>
                      </span>
                    </label>

                    {/* filename indicator + progress */}
                    {uploadFileName && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground max-w-xs truncate">{uploadFileName}</span>
                        <div className="w-24 h-2 bg-background/30 rounded overflow-hidden">
                          <div
                            className="h-full bg-purple-400"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleAnalyze}
                    disabled={!isValidYouTubeUrl(url) || isLoading}
                    size="lg"
                    className={cn(
                      "h-14 md:h-14 px-8 bg-gradient-primary hover:opacity-90",
                      "text-primary-foreground font-semibold rounded-xl",
                      "md:flex-shrink-0",
                      "shadow-glow hover:shadow-xl transition-all duration-300",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      // make full width on small and tablet sizes for easier tapping
                      "w-full md:w-auto",
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
            {/* single upload control now lives inline with URL input — selecting a file auto-uploads (10 MB limit) */}

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
            {/* AI accuracy warning */}
            <div className="text-xs text-muted-foreground text-center mt-2">
              AI might not always be accurate — please review results and check for mistakes.
            </div>
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