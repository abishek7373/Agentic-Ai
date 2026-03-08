import React, { useMemo } from 'react';
import LoginForm from '../components/LoginForm';

function Particles() {
  const particles = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      size: Math.random() * 3 + 1,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: Math.random() * 6 + 4,
      delay: Math.random() * 4,
      opacity: Math.random() * 0.25 + 0.05,
    }));
  }, []);

  return (
    <div className="particles-bg">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            width: p.size + 'px',
            height: p.size + 'px',
            left: p.left + '%',
            top: p.top + '%',
            opacity: p.opacity,
            '--duration': p.duration + 's',
            '--delay': p.delay + 's',
          }}
        />
      ))}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-5">
      <Particles />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        <div className="ui-glass rounded-3xl px-8 py-10 md:px-10 md:py-11">
          {/* Header */}
          <div className="text-center mb-9">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-6">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FF6F61" strokeWidth="1.5">
                <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z" />
              </svg>
            </div>

            <h1 className="font-orbitron text-[1.85rem] font-bold tracking-[0.16em] text-accent">
              STELLARMIND
            </h1>
            <p className="mt-2.5 ui-muted text-sm">
              Cosmic Intelligence Interface
            </p>
          </div>

          {/* Login Form */}
          <LoginForm />

          {/* Footer */}
          <div className="mt-9 text-center">
            <p className="text-text-muted/50 text-[11px] tracking-wide">
              Secured Connection · Encrypted
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
