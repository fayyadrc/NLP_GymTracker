"use client";

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export const CtaSection: React.FC = () => {
  const [email, setEmail] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    toast({
      title: "You're on the list",
      description: "We'll notify you when new features drop. Launch the app to start tracking now.",
    });
    setEmail('');
  };

  return (
    <section className="py-16 md:py-24 px-4 md:px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="ios-card p-8 md:p-12 text-center space-y-6 relative overflow-hidden"
        >
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-64 bg-accent-blue-bg/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-3">
            <span className="ios-badge bg-accent-green-bg text-accent-green">Get Started Free</span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight font-heading">
              Ready to train smarter?
            </h2>
            <p className="text-muted-foreground text-[14px] font-medium leading-relaxed max-w-md mx-auto">
              Join RepCount and let AI handle the data while you focus on the lift.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="relative z-10 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <div className="relative flex-1">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full h-12 pl-11 pr-4 rounded-full border border-border bg-background text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              />
            </div>
            <Button type="submit" className="h-12 rounded-full px-6 font-semibold shrink-0 btn-tap-scale">
              Notify Me
            </Button>
          </form>

          <div className="relative z-10 pt-2">
            <Button
              asChild
              size="lg"
              className="rounded-full px-8 h-12 text-[15px] font-semibold hover:scale-[1.02] transition-transform btn-tap-scale"
            >
              <Link to="/app">
                Launch App
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
