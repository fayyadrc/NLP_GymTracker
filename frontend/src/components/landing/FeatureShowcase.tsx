"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FEATURE_TABS, type FeatureTabId } from '@/lib/landing-data';
import { QuickLogPreview } from './previews/QuickLogPreview';
import { AIInsightsPreview } from './previews/AIInsightsPreview';
import { AnalyticsPreview } from './previews/AnalyticsPreview';
import { DataHealthPreview } from './previews/DataHealthPreview';

const PREVIEW_MAP: Record<FeatureTabId, React.FC> = {
  'quick-log': QuickLogPreview,
  'ai-insights': AIInsightsPreview,
  analytics: AnalyticsPreview,
  'data-health': DataHealthPreview,
};

export const FeatureShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FeatureTabId>('quick-log');
  const activeFeature = FEATURE_TABS.find((t) => t.id === activeTab)!;
  const PreviewComponent = PREVIEW_MAP[activeTab];
  const Icon = activeFeature.icon;

  return (
    <section id="features" className="py-16 md:py-24 px-4 md:px-6">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] font-mono text-muted-foreground">
            The App Views
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight font-heading">
            Everything you need, one dashboard
          </h2>
          <p className="text-muted-foreground text-[14px] font-medium leading-relaxed">
            From quick logging to deep analytics — explore the core views that power your training.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {FEATURE_TABS.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-semibold transition-all duration-200 btn-tap-scale',
                  isActive
                    ? 'bg-foreground text-background shadow-md'
                    : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                )}
              >
                <TabIcon className="w-4 h-4" strokeWidth={isActive ? 2.5 : 2} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="ios-card overflow-hidden">
          <div className="grid md:grid-cols-5 gap-0">
            <div className="md:col-span-2 p-6 md:p-8 space-y-5 border-b md:border-b-0 md:border-r border-border">
              <div className={cn('w-12 h-12 rounded-[16px] flex items-center justify-center', activeFeature.badgeClass)}>
                <Icon className={cn('w-6 h-6', activeFeature.accentClass)} />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-extrabold font-heading tracking-tight">
                  {activeFeature.title}
                </h3>
                <p className="text-muted-foreground text-[14px] font-medium leading-relaxed">
                  {activeFeature.description}
                </p>
              </div>
              <span className={cn('ios-badge inline-block', activeFeature.badgeClass)}>
                {activeFeature.label}
              </span>
            </div>

            <div className="md:col-span-3 premium-dot-grid min-h-[280px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.25 }}
                >
                  <PreviewComponent />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
