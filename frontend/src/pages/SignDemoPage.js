import React, { useEffect, useMemo, useState } from "react";
import SignAvatar from "../components/SignAvatar";
import "./SignDemoPage.css";

const DEMOS = [
  { label: "Greeting", words: ["HELLO", "THANK", "YOU"] },
  { label: "Basics", words: ["YES", "NO", "PLEASE", "HELP"] },
  { label: "Learning", words: ["ME", "LEARN", "SIGN", "GOOD"] },
  { label: "Questions", words: ["WHAT", "WHERE", "WHY", "HOW"] },
  { label: "Emotion", words: ["SORRY", "BAD", "GOOD"] },
];

const MS_PER_WORD = 1250;

export default function SignDemoPage({ onBack }) {
  const [selected, setSelected] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const demo = DEMOS[selected];
  const duration = demo.words.length * MS_PER_WORD;

  useEffect(() => {
    setElapsedMs(0);
  }, [selected]);

  useEffect(() => {
    const startedAt = performance.now();
    const timer = setInterval(() => {
      setElapsedMs((performance.now() - startedAt) % duration);
    }, 33);

    return () => clearInterval(timer);
  }, [duration, selected]);

  const caption = useMemo(
    () => ({
      start: 0,
      end: duration,
      text: demo.words.join(" "),
      gloss: demo.words.join(" "),
      words: demo.words,
    }),
    [demo.words, duration]
  );

  const activeWordIndex = Math.min(
    demo.words.length - 1,
    Math.floor(elapsedMs / MS_PER_WORD)
  );

  return (
    <div className="sign-demo-page">
      <header className="sign-demo-header">
        <button className="back-btn" onClick={onBack}>
          Back
        </button>
        <h1>Sign Demo</h1>
      </header>

      <main className="sign-demo-main">
        <section className="demo-avatar-panel">
          <SignAvatar caption={caption} isActive currentTime={elapsedMs / 1000} />
        </section>

        <aside className="demo-control-panel">
          <div className="demo-status">
            <span className="demo-label">{demo.label}</span>
            <strong>{demo.words[activeWordIndex]}</strong>
          </div>

          <div className="demo-word-row">
            {demo.words.map((word, index) => (
              <span
                key={word}
                className={`demo-word ${index === activeWordIndex ? "active" : ""}`}
              >
                {word}
              </span>
            ))}
          </div>

          <div className="demo-buttons">
            {DEMOS.map((item, index) => (
              <button
                key={item.label}
                className={`demo-select-btn ${index === selected ? "active" : ""}`}
                onClick={() => setSelected(index)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}
