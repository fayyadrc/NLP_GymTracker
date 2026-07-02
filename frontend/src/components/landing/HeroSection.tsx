"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Play, PencilLine, History, BarChart2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuickLogPreview } from './previews/QuickLogPreview';

export const HeroSection: React.FC = () => (
  <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 px-4 md:px-6">
    <div className="max-w-6xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          <span className="ios-badge bg-accent-blue-bg text-accent-blue inline-block">
            AI-Powered Training
          </span>

          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-heading text-foreground leading-[1.08]">
              Track smarter.
              <br />
              <span className="text-muted-foreground">Train harder.</span>
            </h1>
            <p className="text-muted-foreground text-[15px] md:text-base font-medium leading-relaxed max-w-lg">
              RepCount blends gym log data, Strava integrations, and real-time AI intelligence
              to optimize every rep, set, and recovery window.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              asChild
              size="lg"
              className="rounded-full px-8 h-12 text-[15px] font-semibold hover:scale-[1.02] transition-transform btn-tap-scale"
            >
              <Link to="/app">
                Start Tracking
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full px-8 h-12 text-[15px] font-semibold btn-tap-scale"
            >
              <a href="#features">
                <Play className="w-4 h-4 mr-1" />
                View Demo
              </a>
            </Button>
          </div>

          <div className="flex flex-wrap gap-4 pt-2">
            {[
              { label: 'Natural language logging', color: 'bg-accent-orange' },
              { label: 'Strava sync', color: 'bg-accent-green' },
              { label: 'AI recommendations', color: 'bg-accent-violet' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
                <span className="text-[12px] font-medium text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative"
        >
          <div className="ios-card overflow-hidden shadow-2xl">
            <div className="flex border-b border-border bg-card">
              <div className="hidden sm:flex w-14 md:w-16 border-r border-border flex-col items-center py-4 gap-4 shrink-0">
                {[PencilLine, History, BarChart2, User].map((Icon, i) => (
                  <div
                    key={i}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      i === 0 ? 'bg-foreground text-background' : 'text-muted-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4" strokeWidth={i === 0 ? 2.5 : 2} />
                  </div>
                ))}
              </div>
              <div className="flex-1 premium-dot-grid min-h-[320px] md:min-h-[380px]">
                <div className="p-4 md:p-6 space-y-3">
                  <h3 className="text-lg font-extrabold font-heading">Log your workout</h3>
                  <p className="text-[12px] text-muted-foreground font-medium">
                    Start typing in natural language and let RepCount worry about the details.
                  </p>
                </div>
                <QuickLogPreview />
              </div>
            </div>
          </div>

          <div className="absolute -z-10 -bottom-6 -right-6 w-48 h-48 bg-accent-violet-bg/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -z-10 -top-6 -left-6 w-40 h-40 bg-accent-blue-bg/30 rounded-full blur-3xl pointer-events-none" />
        </motion.div>
      </div>
    </div>
  </section>
);
