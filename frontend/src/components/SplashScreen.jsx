import { useState, useEffect } from 'react';

/**
 * Animated splash screen using the Rock The Yacht logo.
 * Shown on initial app load for a polished branded intro.
 */
export default function SplashScreen({ isVisible, onExit }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!isVisible) return;
    const displayMs = 1800;
    const exitMs = 450;
    const t = setTimeout(() => {
      setExiting(true);
      setTimeout(onExit, exitMs);
    }, displayMs);
    return () => clearTimeout(t);
  }, [isVisible, onExit]);

  if (!isVisible) return null;

  return (
    <div
      className={`splash-screen ${exiting ? 'splash-exit' : ''}`}
      aria-hidden="true"
    >
      <style>{`
        .splash-screen {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: linear-gradient(160deg, #0d1829 0%, #060b16 50%, #0a1520 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .splash-screen::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 80% 50% at 50% 60%, rgba(100, 180, 220, 0.06) 0%, transparent 60%);
          pointer-events: none;
        }
        .splash-logo-wrap {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }
        .splash-logo {
          max-width: min(280px, 70vw);
          height: auto;
          filter: drop-shadow(0 4px 24px rgba(0,0,0,0.4));
          animation: splash-logo-enter 1s ease-out forwards;
        }
        .splash-wave {
          width: 120%;
          height: 4px;
          background: linear-gradient(90deg,
            transparent,
            rgba(100, 180, 220, 0.3),
            rgba(100, 180, 220, 0.8),
            rgba(100, 180, 220, 0.3),
            transparent
          );
          background-size: 200% 100%;
          animation: splash-wave-flow 2s ease-in-out infinite, splash-wave-fade 0.6s 0.4s ease-out forwards;
          margin-top: 8px;
          opacity: 0;
        }
        @keyframes splash-wave-fade {
          to { opacity: 1; }
        }
        .splash-loading {
          font-family: 'Josefin Sans', sans-serif;
          font-size: 11px;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: rgba(201, 168, 76, 0.7);
          animation: splash-pulse 1.2s ease-in-out infinite;
        }
        .splash-loading::after {
          content: '';
          animation: splash-dots 1.5s steps(4, end) infinite;
        }
        @keyframes splash-logo-enter {
          from {
            opacity: 0;
            transform: scale(0.85) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes splash-wave-flow {
          0%, 100% { background-position: 100% 0; }
          50% { background-position: 0 0; }
        }
        @keyframes splash-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes splash-dots {
          0%, 20% { content: ''; }
          40% { content: '.'; }
          60% { content: '..'; }
          80%, 100% { content: '...'; }
        }
        .splash-exit .splash-logo {
          animation: splash-logo-exit 0.45s ease-in forwards;
        }
        .splash-exit .splash-wave,
        .splash-exit .splash-loading {
          opacity: 0;
          transition: opacity 0.25s ease-out;
        }
        @keyframes splash-logo-exit {
          to {
            opacity: 0;
            transform: scale(1.05) translateY(-10px);
          }
        }
      `}</style>

      <div className="splash-logo-wrap">
        <img
          src="/logo.png"
          alt="Rock The Yacht"
          className="splash-logo"
        />
        <div className="splash-wave" />
        <div className="splash-loading">Loading</div>
      </div>
    </div>
  );
}
