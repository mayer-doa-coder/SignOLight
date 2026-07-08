import React, { useState } from "react";
import LandingPage from "./pages/LandingPage";
import PlayerPage from "./pages/PlayerPage";
import SignDemoPage from "./pages/SignDemoPage";
import "./styles/global.css";

function App() {
  const [currentPage, setCurrentPage] = useState(
    window.location.pathname === "/sign-demo" ? "sign-demo" : "landing"
  );
  const [videoData, setVideoData] = useState(null);

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

  return (
    <div className="app">
      {currentPage === "landing" && (
        <LandingPage
          onVideoSubmit={handleVideoSubmit}
          onOpenSignDemo={handleOpenSignDemo}
        />
      )}
      {currentPage === "player" && videoData && (
        <PlayerPage videoData={videoData} onBack={handleBack} />
      )}
      {currentPage === "sign-demo" && (
        <SignDemoPage onBack={handleBack} />
      )}
    </div>
  );
}

export default App;
