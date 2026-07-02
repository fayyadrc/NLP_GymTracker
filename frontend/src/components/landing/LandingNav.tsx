"use client";

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Moon, Sun, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LANDING_NAV_LINKS } from '@/lib/landing-data';
import { useTheme } from '@/hooks/use-theme';

export const LandingNav: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const handleAnchorClick = () => setMobileOpen(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 pt-4 md:px-6">
      <nav
        className={cn(
          'glass-nav mx-auto max-w-6xl rounded-[24px] transition-shadow duration-300',
          scrolled && 'shadow-lg'
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 md:px-6">
          <a href="#" className="flex flex-col shrink-0">
            <span className="text-xl md:text-2xl font-extrabold tracking-tight font-heading text-foreground">
              RepCount
            </span>
            <span className="text-[8px] md:text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-bold font-mono">
              AI Gym Intelligence
            </span>
          </a>

          <div className="hidden lg:flex items-center gap-1">
            {LANDING_NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground rounded-xl transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary transition-colors btn-tap-scale"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-foreground" />
              ) : (
                <Moon className="w-4 h-4 text-foreground" />
              )}
            </button>

            <Button
              asChild
              className="hidden sm:inline-flex rounded-full px-5 font-semibold btn-tap-scale"
            >
              <Link to="/app">Launch App</Link>
            </Button>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary transition-colors btn-tap-scale"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden border-t border-border px-4 py-3 space-y-1">
            {LANDING_NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={handleAnchorClick}
                className="block px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors"
              >
                {link.label}
              </a>
            ))}
            <Button asChild className="w-full mt-2 rounded-full font-semibold">
              <Link to="/app" onClick={handleAnchorClick}>Launch App</Link>
            </Button>
          </div>
        )}
      </nav>
    </header>
  );
};
