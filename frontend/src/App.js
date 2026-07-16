import React, { useEffect, useState } from "react";
import LandingPage from "./pages/LandingPage";
import PlayerPage from "./pages/PlayerPage";
import SignDemoPage from "./pages/SignDemoPage";
import PoseTunerPage from "./pages/PoseTunerPage";
import MixamoDemoPage from "./pages/MixamoDemoPage";
import "./styles/global.css";

function initialPage() {
  const { pathname } = window.location;
  if (pathname === "/sign-demo") return "sign-demo";
  if (pathname === "/pose-tuner") return "pose-tuner";
  if (pathname === "/mixamo-demo") return "mixamo-demo";
  return "landing";
}

function App() {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [videoData, setVideoData] = useState(null);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(initialPage());
      if (window.location.pathname !== "/") {
        setVideoData(null);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleVideoSubmit = (data) => {
    window.history.pushState({}, "", "/");
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

  return (
    <div className="app">
      {currentPage === "landing" && (
        <LandingPage
          onVideoSubmit={handleVideoSubmit}
          onOpenSignDemo={handleOpenSignDemo}
          onOpenMixamoDemo={handleOpenMixamoDemo}
        />
      )}
      {currentPage === "player" && videoData && (
        <PlayerPage videoData={videoData} onBack={handleBack} />
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
    </div>
  );
}

export default App;
