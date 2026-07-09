"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-neutral-700">{label}</label>
        )}
        <input
          ref={ref}
          className={`h-10 px-3 text-sm rounded border bg-[var(--bg-input)] text-[var(--text-primary)] border-[var(--border)] transition-colors placeholder:text-neutral-400 focus:outline-none focus:border-teranga-500 focus:ring-2 focus:ring-teranga-500/20 ${
            error ? "border-error focus:border-error focus:ring-error/20" : ""
          } ${className}`}
          {...props}
        />
        {error && <span className="text-xs font-medium text-error">{error}</span>}
        {helper && !error && <span className="text-xs text-neutral-500">{helper}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";