"use client"

import { cn } from "@/lib/utils"
import { useState } from "react"

interface SwitchProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
}

export function Switch({ checked = false, onCheckedChange, disabled }: SwitchProps) {
  const [internal, setInternal] = useState(checked)

  const isChecked = onCheckedChange ? checked : internal

  const handleClick = () => {
    if (disabled) return
    const next = !isChecked
    if (onCheckedChange) {
      onCheckedChange(next)
    } else {
      setInternal(next)
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isChecked ? "bg-primary" : "bg-input",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
          isChecked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  )
}
