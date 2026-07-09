import { forwardRef, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "default" | "lg";
  loading?: boolean;
}

const variants = {
  primary:
    "bg-teranga-500 text-white hover:bg-teranga-600 active:bg-teranga-700 disabled:bg-teranga-200",
  secondary:
    "border border-teranga-500 text-teranga-600 hover:bg-teranga-50 active:bg-teranga-100 disabled:text-neutral-400 disabled:border-neutral-300",
  danger:
    "bg-error text-white hover:bg-red-700 active:bg-red-800",
  ghost:
    "text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200",
};

const sizes = {
  sm: "h-8 px-3 text-xs",
  default: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "default", loading, className = "", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 rounded radius font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-teranga-500 focus-visible:outline-offset-2 disabled:cursor-not-allowed active:scale-[0.98] ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";