"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  maxWidth?: string; // e.g. "max-w-lg", "max-w-xl"
  children: React.ReactNode;
}

export default function SlideOver({
  isOpen,
  onClose,
  title,
  subtitle,
  maxWidth = "max-w-lg",
  children,
}: SlideOverProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-hidden animate-fade-in"
      style={{ pointerEvents: "auto" }}
    >
      {/* Full screen backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div
        className="fixed inset-y-0 right-0 max-w-full flex pl-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`w-screen ${maxWidth} bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-scale-in text-left`}
        >
          {/* Pinned Header */}
          <div className="px-6 py-4 flex items-center justify-between border-b bg-white shrink-0">
            <div>
              <h3
                className="font-bold text-base text-slate-900"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {title}
              </h3>
              {subtitle && (
                <div className="mt-0.5">
                  {typeof subtitle === "string" ? (
                    <p className="text-xs font-bold text-amber-800">{subtitle}</p>
                  ) : (
                    subtitle
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              aria-label="Close panel"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
