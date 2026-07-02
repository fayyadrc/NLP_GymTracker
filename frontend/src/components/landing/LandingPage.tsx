"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Dumbbell, LineChart, RefreshCw, Sparkles } from 'lucide-react';
import { QuickLogPreview } from '@/components/landing/previews/QuickLogPreview';
import { tasteSpring, tasteStagger } from '@/lib/motion';

const BENTO_ROW1 = [
  {
    title: 'Plain-text parsing',
    body: 'Dump your session as notes. Exercises, sets, reps, and load extract automatically.',
    icon: Sparkles,
  },
  {
    title: 'Top-set tracking',
    body: 'Progress follows peak sets per exercise, not warmups or backoff work.',
    icon: Dumbbell,
  },
  {
    title: 'Strava sync',
    body: 'Cardio duration and heart rate sit next to your logged strength work.',
    icon: RefreshCw,
  },
] as const;

export const LandingPage: React.FC = () => {
  const reduceMotion = useReducedMotion();

  const reveal = (index = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.2 },
          transition: tasteStagger(index),
        };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-40 glass-nav">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 md:px-8 lg:px-16">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background">
              <Dumbbell className="h-4 w-4 stroke-[2]" />
            </span>
            <span className="text-base font-semibold tracking-tight">repcount</span>
          </Link>
          <Link to="/app" className="btn-primary hidden sm:inline-flex">
            Open app
            <ArrowRight className="h-4 w-4 stroke-[2]" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 md:px-8 lg:px-16">
        {/* Asymmetric split hero + inline image typography */}
        <section className="grid gap-12 py-16 md:grid-cols-2 md:items-center md:gap-16 lg:py-24">
          <motion.div {...reveal(0)} className="space-y-8">
            <h1 className="display-title text-foreground">
              <span className="hero-inline-words">
                One logbook for{' '}
                <img
                  src="https://picsum.photos/seed/repcount-barbell/120/90"
                  alt="Barbell on gym floor"
                  className="inline-type-img"
                  width={120}
                  height={90}
                />{' '}
                lifting and{' '}
                <img
                  src="https://picsum.photos/seed/repcount-watch/120/90"
                  alt="Fitness watch tracking workout"
                  className="inline-type-img"
                  width={120}
                  height={90}
                />{' '}
                recovery
              </span>
            </h1>
            <p className="body-copy text-base md:text-lg">
              RepCount unifies strength logs with Strava cardio so load, progress, and fatigue live in one timeline.
            </p>
            <Link to="/app" className="btn-primary w-full sm:w-auto">
              Open app
              <ArrowRight className="h-4 w-4 stroke-[2]" />
            </Link>
          </motion.div>

          <motion.div {...reveal(1)} className="taste-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <span className="data-value text-muted-foreground">parse preview</span>
              <span className="ios-badge border border-primary/20 bg-accent-blue-bg text-primary">ready</span>
            </div>
            <QuickLogPreview />
          </motion.div>
        </section>

        {/* Bento: row 1 (3 cols) + row 2 (70/30) */}
        <section className="space-y-6 border-t border-border py-16 lg:py-24">
          <motion.h2 {...reveal(0)} className="max-w-xl text-2xl font-bold tracking-tight md:text-3xl">
            Built for people who already log everything
          </motion.h2>

          <div className="grid gap-4 md:grid-cols-3">
            {BENTO_ROW1.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.article
                  key={item.title}
                  {...reveal(index + 1)}
                  className="taste-card taste-card-pad flex flex-col justify-between gap-8"
                >
                  <div className="animate-float flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-blue-bg text-primary">
                    <Icon className="h-5 w-5 stroke-[2]" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold tracking-tight">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                  </div>
                </motion.article>
              );
            })}
          </div>

          <div className="grid gap-4 md:grid-cols-[7fr_3fr]">
            <motion.article {...reveal(4)} className="taste-card taste-card-pad grid gap-6 md:grid-cols-2 md:items-center">
              <img
                src="https://picsum.photos/seed/repcount-timeline/720/480"
                alt="Training session timeline view"
                className="w-full rounded-2xl object-cover"
                loading="lazy"
              />
              <div className="space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <LineChart className="h-5 w-5 stroke-[2]" />
                </div>
                <h3 className="text-xl font-bold tracking-tight">Unified timeline</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Gym sessions and Strava activities share one history view. Filter by split, search exercises, expand sets inline.
                </p>
              </div>
            </motion.article>

            <motion.article {...reveal(5)} className="taste-card taste-card-pad flex flex-col justify-between bg-accent-blue-bg/40">
              <p className="data-value text-muted-foreground">this month</p>
              <div className="space-y-4 py-4">
                <div>
                  <p className="display-title text-4xl text-primary">12</p>
                  <p className="text-sm text-muted-foreground">logged sessions</p>
                </div>
                <div>
                  <p className="display-title text-4xl text-foreground">4.2k</p>
                  <p className="text-sm text-muted-foreground">kg moved</p>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Sample dashboard metrics from a typical training block.
              </p>
            </motion.article>
          </div>
        </section>

        {/* Founder story - zig-zag */}
        <section className="grid gap-12 border-t border-border py-16 md:grid-cols-2 md:items-center lg:py-24">
          <motion.div {...reveal(0)} className="order-2 md:order-1">
            <img
              src="https://picsum.photos/seed/repcount-gym-floor/900/700"
              alt="Gym floor with equipment"
              className="w-full rounded-[2.5rem] object-cover"
              loading="lazy"
            />
          </motion.div>
          <motion.div {...reveal(1)} className="order-1 space-y-6 md:order-2">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Why I built RepCount</h2>
            <div className="body-copy space-y-4 text-sm md:text-base">
              <p>
                I track every gym session on a Mi Band and log weights in a separate notes app. Heart rate lived in one place. Sets lived in another.
              </p>
              <p>
                The band syncs to Strava, which has a real API. RepCount became the hub: parse plain-text workouts, store progression, pull cardio when it matters.
              </p>
              <p className="font-medium text-foreground">Personal tool first. Shared because the pipeline works.</p>
            </div>
          </motion.div>
        </section>

        {/* Strava integration */}
        <section className="border-t border-border py-14 lg:py-20">
          <motion.div {...reveal(0)} className="taste-card taste-card-pad flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight">Works with Strava</h2>
              <p className="body-copy text-sm">
                Import activities, duration, and heart rate alongside logged gym sessions.
              </p>
            </div>
            <img
              src="https://cdn.simpleicons.org/strava/FC4C02"
              alt="Strava"
              width={40}
              height={40}
              className="h-10 w-10"
            />
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-10 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-8 lg:px-16">
          <p>© {new Date().getFullYear()} repcount</p>
          <Link to="/app" className="font-semibold text-primary hover:text-primary/80">
            Open app
          </Link>
        </div>
      </footer>
    </div>
  );
};
