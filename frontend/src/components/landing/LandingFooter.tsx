import React from 'react';
import { Link } from 'react-router-dom';
import { Smartphone, Monitor, Watch } from 'lucide-react';
import { FOOTER_LINKS } from '@/lib/landing-data';

export const LandingFooter: React.FC = () => (
  <footer className="border-t border-border py-10 px-4 md:px-6">
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-1">
          <span className="text-xl font-extrabold font-heading">RepCount</span>
          <p className="text-[12px] text-muted-foreground font-medium">
            AI Gym Intelligence — web, mobile &amp; wearables
          </p>
        </div>

        <div className="flex items-center gap-4 text-muted-foreground">
          <div className="flex items-center gap-1.5 text-[12px] font-medium">
            <Monitor className="w-4 h-4" />
            Web
          </div>
          <div className="flex items-center gap-1.5 text-[12px] font-medium">
            <Smartphone className="w-4 h-4" />
            Mobile
          </div>
          <div className="flex items-center gap-1.5 text-[12px] font-medium">
            <Watch className="w-4 h-4" />
            Wearables
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-border/50">
        <p className="text-[12px] text-muted-foreground font-mono">
          &copy; {new Date().getFullYear()} RepCount. All rights reserved.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          {FOOTER_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
          <Link
            to="/app"
            className="text-[12px] font-semibold text-foreground hover:underline"
          >
            Launch App
          </Link>
        </div>
      </div>
    </div>
  </footer>
);
