import React, { useEffect, useState } from "react";
import LandingPage from "./pages/LandingPage";
import PlayerPage from "./pages/PlayerPage";
import SignDemoPage from "./pages/SignDemoPage";
import PoseTunerPage from "./pages/PoseTunerPage";
import MixamoDemoPage from "./pages/MixamoDemoPage";
import HowItWorksPage from "./pages/HowItWorksPage";
import "./styles/global.css";

function initialPage() {
  const { pathname } = window.location;
  if (pathname === "/sign-demo") return "sign-demo";
  if (pathname === "/pose-tuner") return "pose-tuner";
  if (pathname === "/mixamo-demo") return "mixamo-demo";
  if (pathname === "/how-it-works") return "how-it-works";
  if (pathname === "/mixamo") return "mixamo-landing";
  return "landing";
}

function App() {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [videoData, setVideoData] = useState(null);
  const [avatarMode, setAvatarMode] = useState(
    window.location.pathname.startsWith("/mixamo") ? "mixamo" : "vrm"
  );

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(initialPage());
      setAvatarMode(window.location.pathname.startsWith("/mixamo") ? "mixamo" : "vrm");
      if (window.location.pathname !== "/") {
        setVideoData(null);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleVideoSubmit = (data, mode = "vrm") => {
    window.history.pushState({}, "", mode === "mixamo" ? "/mixamo" : "/");
    setAvatarMode(mode);
    setVideoData(data);
    setCurrentPage("player");
  };

  const handleBack = () => {
    window.history.pushState({}, "", "/");
    setCurrentPage("landing");
    setVideoData(null);
  };

  const handleOpenSignDemo = () => {
    window.history.pushState({}, "", "/sign-demo");
    setCurrentPage("sign-demo");
    setVideoData(null);
  };

  const handleOpenMixamoDemo = () => {
    window.history.pushState({}, "", "/mixamo-demo");
    setCurrentPage("mixamo-demo");
    setVideoData(null);
  };

  const handleOpenHowItWorks = () => {
    window.history.pushState({}, "", "/how-it-works");
    setCurrentPage("how-it-works");
    setVideoData(null);
  };

  const handleOpenMixamoYouTube = () => {
    window.history.pushState({}, "", "/mixamo");
    setAvatarMode("mixamo");
    setCurrentPage("mixamo-landing");
    setVideoData(null);
  };

  const handleOpenVrmHome = () => {
    window.history.pushState({}, "", "/");
    setAvatarMode("vrm");
    setCurrentPage("landing");
    setVideoData(null);
  };

  const handlePlayerBack = () => {
    if (avatarMode === "mixamo") {
      handleOpenMixamoYouTube();
    } else {
      handleBack();
    }
  };

  return (
    <div className="app">
      {currentPage === "landing" && (
        <LandingPage
          onVideoSubmit={handleVideoSubmit}
          onOpenSignDemo={handleOpenSignDemo}
          onOpenMixamoDemo={handleOpenMixamoDemo}
          onOpenMixamoYouTube={handleOpenMixamoYouTube}
          onOpenVrmHome={handleOpenVrmHome}
          onOpenHowItWorks={handleOpenHowItWorks}
          avatarMode="vrm"
        />
      )}
      {currentPage === "mixamo-landing" && (
        <LandingPage
          onVideoSubmit={handleVideoSubmit}
          onOpenSignDemo={handleOpenSignDemo}
          onOpenMixamoDemo={handleOpenMixamoDemo}
          onOpenMixamoYouTube={handleOpenMixamoYouTube}
          onOpenVrmHome={handleOpenVrmHome}
          onOpenHowItWorks={handleOpenHowItWorks}
          avatarMode="mixamo"
        />
      )}
      {currentPage === "player" && videoData && (
        <PlayerPage
          videoData={videoData}
          onBack={handlePlayerBack}
          avatarMode={avatarMode}
        />
      )}
      {currentPage === "sign-demo" && (
        <SignDemoPage onBack={handleBack} />
      )}
      {currentPage === "pose-tuner" && (
        <PoseTunerPage onBack={handleBack} />
      )}
      {currentPage === "mixamo-demo" && (
        <MixamoDemoPage onBack={handleBack} />
      )}
      {currentPage === "how-it-works" && (
        <HowItWorksPage onBack={handleBack} onStart={handleOpenMixamoYouTube} />
      )}
    </div>
  );
}

export default App;
