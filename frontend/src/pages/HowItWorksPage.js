import React, { useEffect, useRef } from "react";
import "./HowItWorksPage.css";

const FLOW_STEPS = [
  {
    number: "01",
    label: "Input",
    title: "Paste any public YouTube URL",
    description:
      "The landing page sends the URL to the Node API. The URL parser accepts watch, short, mobile, music, live, embed and youtu.be formats.",
    endpoint: "GET /api/video/info",
    chips: ["videoId", "title", "author", "thumbnail"],
    route: ["Browser", "Express", "YouTube oEmbed"],
  },
  {
    number: "02",
    label: "Player",
    title: "Load the video without losing control",
    description:
      "The YouTube IFrame API loads the selected video. SignOLight reads the current time every 100 ms and exposes play, pause, seek and playback-rate controls.",
    endpoint: "YouTubePlayer.js",
    chips: ["100 ms clock", "pause-safe", "seek-safe"],
    route: ["IFrame API", "Player clock", "React state"],
  },
  {
    number: "03",
    label: "Cache gate",
    title: "Use saved processing when it already exists",
    description:
      "Before doing expensive work, the player checks the hot memory cache and the persistent JSON cache. A hit moves directly to synchronized playback.",
    endpoint: "GET /api/cache/:videoId",
    chips: ["memory Map", "JSON disk cache", "restart-safe"],
    route: ["Video ID", "Hot cache", "File cache"],
    branches: [
      {
        name: "Cache hit",
        detail: "Return signed captions immediately.",
        accent: true,
      },
      {
        name: "Cache miss",
        detail: "Continue to caption extraction.",
      },
    ],
  },
  {
    number: "04",
    label: "Captions",
    title: "Build a timed English transcript",
    description:
      "The backend tries YouTube caption tracks, the timed-text API, direct VTT/XML URLs and the transcript library. Manual and automatic captions share the same normalized timeline.",
    endpoint: "GET /api/captions",
    chips: ["VTT", "XML", "auto CC", "start/end ms"],
    route: ["Caption tracks", "Timed text", "Transcript fallback"],
  },
  {
    number: "05",
    label: "Meaning",
    title: "Simplify language and create sign-ready tokens",
    description:
      "Groq converts each English caption into concise sign-friendly gloss. If the model is unavailable or the video is large, the deterministic heuristic keeps the pipeline working.",
    endpoint: "POST /api/sign/batch",
    chips: ["simplified text", "gloss", "known signs", "[CONCEPT:word]"],
    route: ["Caption text", "Groq or heuristic", "Sign tokens"],
    branches: [
      {
        name: "Known vocabulary",
        detail: "Use an authored sign or procedural gesture.",
        accent: true,
      },
      {
        name: "Unknown vocabulary",
        detail: "Create a visible fingerspelling sequence.",
      },
    ],
  },
  {
    number: "06",
    label: "বাংলা",
    title: "Translate and preserve the original timing",
    description:
      "When বাংলা is selected, the API first checks its translation cache. It tries YouTube translation and then the free Google translation fallback, while keeping every caption boundary unchanged.",
    endpoint: "GET /api/captions?lang=bn",
    chips: ["English → বাংলা", "free fallback", "translation cache"],
    route: ["Timed English", "Bangla translation", "Same timestamps"],
    bangla: true,
  },
  {
    number: "07",
    label: "Alphabet routing",
    title: "Turn each word into readable hand units",
    description:
      "English unknown words become A–Z or 0–9 finger units. Bangla words become native-script tokens and are expanded through the supplied Bangla manual alphabet map.",
    endpoint: "mixamoGestureMap.js",
    chips: ["A–Z", "০–৯", "অ–ঃ", "front-facing hands"],
    route: ["Word token", "Letter map", "Finger pose"],
    bangla: true,
    branches: [
      {
        name: "English",
        detail: "Known sign or deterministic Latin fingerspelling.",
      },
      {
        name: "বাংলা",
        detail: "Native Bangla character stays visible while signing.",
        accent: true,
      },
    ],
  },
  {
    number: "08",
    label: "Timing",
    title: "Give every sign enough visible time",
    description:
      "WhisperX word boundaries are used when the optional NLP service responds. Otherwise, caption boundaries and character/syllable weighting create deterministic word windows.",
    endpoint: "timelineScheduler.js",
    chips: ["WhisperX optional", "character weight", "auto 1×–¼×"],
    route: ["Speech span", "Weighted windows", "Readable rate"],
    branches: [
      {
        name: "WhisperX ready",
        detail: "Use actual spoken-word boundaries.",
        accent: true,
      },
      {
        name: "WhisperX unavailable",
        detail: "Fall back without blocking playback.",
      },
    ],
  },
  {
    number: "09",
    label: "Avatar",
    title: "Drive the VRM or articulated Mixamo rig",
    description:
      "The current token selects a body pose, hand shape and finger chain. Bangla mode uses the Mixamo humanoid so individual thumb, index, middle, ring and pinky joints can be controlled.",
    endpoint: "SignAvatar + MixamoAvatar",
    chips: ["VRM clips", "FBX rig", "30 finger bones", "smooth poses"],
    route: ["Gesture ID", "Rig joints", "Rendered sign"],
  },
  {
    number: "10",
    label: "Synchronization",
    title: "Recalculate from video time on every update",
    description:
      "A binary search finds the active caption, then the scheduler resolves the exact word and letter progress. Pause freezes the avatar; seeking immediately snaps to the correct point.",
    endpoint: "PlayerPage + findCaption",
    chips: ["binary search", "word progress", "pause", "seek", "caption bar"],
    route: ["Video time", "Active caption", "Matching sign"],
  },
];

const LAYERS = [
  {
    index: "A",
    title: "React interface",
    detail: "URL input, YouTube player, language controls, caption timeline and avatars.",
  },
  {
    index: "B",
    title: "Node processing API",
    detail: "Metadata, caption extraction, translation, gloss generation and caches.",
  },
  {
    index: "C",
    title: "Optional NLP service",
    detail: "WhisperX downloads audio and returns word-level speech boundaries.",
  },
  {
    index: "D",
    title: "Deterministic renderer",
    detail: "Timeline scheduler maps the current millisecond to a reproducible hand pose.",
  },
];

export default function HowItWorksPage({ onBack, onStart }) {
  const pageRef = useRef(null);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return undefined;

    const revealItems = [...page.querySelectorAll("[data-flow-reveal]")];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );
    revealItems.forEach((item) => observer.observe(item));

    let frame = 0;
    const updateProgress = () => {
      frame = 0;
      const flow = page.querySelector(".process-flow");
      if (!flow) return;
      const rect = flow.getBoundingClientRect();
      const startLine = window.innerHeight * 0.42;
      const travel = Math.max(1, rect.height - window.innerHeight * 0.3);
      const progress = Math.max(0, Math.min(1, (startLine - rect.top) / travel));
      flow.style.setProperty("--flow-progress", progress);
    };
    const handleScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="how-page" ref={pageRef}>
      <header className="how-nav">
        <button className="how-brand" onClick={onBack} aria-label="Back to SignOLight">
          SignOLight
        </button>
        <div className="how-nav-actions">
          <span>System walkthrough</span>
          <button onClick={onStart}>Open converter</button>
        </div>
      </header>

      <main>
        <section className="how-hero">
          <div className="how-hero-copy" data-flow-reveal>
            <p className="how-kicker">From a YouTube link to synchronized signing</p>
            <h1>See the complete process move.</h1>
            <p>
              Scroll through the exact flow used by this project. Every arrow below
              corresponds to a real component, API route, cache or fallback in the codebase.
            </p>
            <div className="how-hero-actions">
              <a href="#process-flow">Follow the flow <span aria-hidden="true">↓</span></a>
              <button onClick={onBack}>Back home</button>
            </div>
          </div>

          <div className="hero-flow-demo" aria-label="Animated processing overview" data-flow-reveal>
            <div className="demo-node demo-video">
              <span>01</span>
              <strong>YouTube</strong>
              <small>URL + captions</small>
            </div>
            <div className="demo-arrow"><i /></div>
            <div className="demo-node demo-process">
              <span>02</span>
              <strong>Process</strong>
              <small>translate + time</small>
            </div>
            <div className="demo-arrow"><i /></div>
            <div className="demo-node demo-avatar">
              <span>03</span>
              <strong>Avatar</strong>
              <small>sign in sync</small>
            </div>
          </div>
        </section>

        <section className="architecture-section">
          <div className="section-heading" data-flow-reveal>
            <p className="how-kicker">Repository architecture</p>
            <h2>Four layers, one shared timeline</h2>
          </div>
          <div className="architecture-lanes">
            {LAYERS.map((layer, index) => (
              <React.Fragment key={layer.index}>
                <article className="architecture-card" data-flow-reveal>
                  <span>{layer.index}</span>
                  <h3>{layer.title}</h3>
                  <p>{layer.detail}</p>
                </article>
                {index < LAYERS.length - 1 && (
                  <div className="architecture-arrow" aria-hidden="true">
                    <span>→</span>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </section>

        <section className="process-section" id="process-flow">
          <div className="section-heading centered" data-flow-reveal>
            <p className="how-kicker">Live processing path</p>
            <h2>One scroll. Ten real stages.</h2>
            <p>The illuminated line follows your position through the pipeline.</p>
          </div>

          <div className="process-flow">
            <div className="flow-spine" aria-hidden="true">
              <div className="flow-spine-progress" />
            </div>

            {FLOW_STEPS.map((step, index) => (
              <article
                className={`flow-step ${index % 2 === 0 ? "flow-left" : "flow-right"} ${
                  step.bangla ? "flow-bangla" : ""
                }`}
                key={step.number}
                data-flow-reveal
              >
                <div className="flow-marker" aria-hidden="true">
                  <span>{step.number}</span>
                </div>
                <div className="flow-card">
                  <div className="flow-card-topline">
                    <span>{step.label}</span>
                    <code>{step.endpoint}</code>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>

                  <div className="flow-route" aria-label={step.route.join(" to ")}>
                    {step.route.map((routeItem, routeIndex) => (
                      <React.Fragment key={routeItem}>
                        <span>{routeItem}</span>
                        {routeIndex < step.route.length - 1 && <i aria-hidden="true">→</i>}
                      </React.Fragment>
                    ))}
                  </div>

                  {step.branches && (
                    <div className="flow-branches">
                      {step.branches.map((branch) => (
                        <div
                          className={branch.accent ? "branch-card branch-accent" : "branch-card"}
                          key={branch.name}
                        >
                          <span>{branch.name}</span>
                          <p>{branch.detail}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flow-chips">
                    {step.chips.map((chip) => <span key={chip}>{chip}</span>)}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="result-section">
          <div className="result-card" data-flow-reveal>
            <p className="how-kicker">The final loop</p>
            <h2>Video, captions and hands stay on the same clock.</h2>
            <div className="result-loop" aria-label="Synchronized playback loop">
              <span>Video time</span>
              <i>→</i>
              <span>Caption</span>
              <i>→</i>
              <span>Word / letter</span>
              <i>→</i>
              <span>Hand pose</span>
              <i className="loop-return">↺</i>
            </div>
            <p className="result-note">
              No animation queue has to “catch up.” The pose is recalculated from the
              current video timestamp, so pause, rewind and seek remain deterministic.
            </p>
            <button onClick={onStart}>Try the converter</button>
          </div>
        </section>
      </main>
    </div>
  );
}
