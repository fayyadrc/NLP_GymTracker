"use client";

import React, { useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, Check, MoreHorizontal } from 'lucide-react';

interface NotesInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export const NotesInput: React.FC<NotesInputProps> = ({
  value,
  onChange,
  onSubmit,
  isSubmitting,
  placeholder = "Start writing...",
  disabled = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const minH = window.innerWidth < 768 ? 280 : 500;
    textarea.style.height = `${Math.max(minH, textarea.scrollHeight)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (value.trim() && !isSubmitting) {
        onSubmit();
      }
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-transparent">
      {/* Writing Surface */}
      <div className="flex-1 px-6 pt-6 overflow-y-auto relative md:px-8 md:pt-8">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isSubmitting}
          placeholder={placeholder}
          aria-label="Workout log input"
          className={cn(
            "w-full bg-transparent border-none outline-none resize-none",
            "text-[17px] md:text-[19px] leading-[1.5] text-foreground",
            "placeholder:text-muted-foreground placeholder:text-[14px]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
          style={{ minHeight: '240px' }}
          autoFocus
        />
      </div>
    </div>
  );
};
