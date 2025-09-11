import { MusicSidebar } from "@/components/sidebar/MusicSidebar";
import { HeroSection } from "@/components/hero/HeroSection";
import { UserProfile } from "@/components/auth/UserProfile";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-hero flex">
      <MusicSidebar />
      <div className="flex-1 relative">
        <div className="absolute top-4 right-4 z-10">
          <UserProfile />
        </div>
        <HeroSection />
      </div>
    </div>
  );
};

export default Index;
