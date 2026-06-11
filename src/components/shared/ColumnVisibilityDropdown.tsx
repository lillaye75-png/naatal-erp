"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Columns, EyeOff } from "lucide-react"

interface ColumnOption {
  id: string
  label: string
}

interface ColumnVisibilityDropdownProps {
  columns: ColumnOption[]
  visible: Set<string>
  onToggle: (colId: string) => void
  onReset: () => void
}

export function ColumnVisibilityDropdown({ columns, visible, onToggle, onReset }: ColumnVisibilityDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <Columns className="w-4 h-4 mr-1" />
        Colonnes
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
        <DropdownMenuLabel>Colonnes visibles</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((col) => (
          <DropdownMenuCheckboxItem
            key={col.id}
            checked={visible.has(col.id)}
            onCheckedChange={() => onToggle(col.id)}
          >
            {col.label}
          </DropdownMenuCheckboxItem>
        ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={onReset}>
          <EyeOff className="w-3 h-3 mr-1" />
          Réinitialiser
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
