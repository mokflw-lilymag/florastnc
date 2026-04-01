"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface AccordionProps {
  children: React.ReactNode
  className?: string
}

export function Accordion({ children, className }: AccordionProps) {
  return (
    <div className={cn("divide-y divide-slate-100 border-y border-slate-100", className)}>
      {children}
    </div>
  )
}

interface AccordionItemProps {
  title: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
}

export function AccordionItem({ title, children, defaultOpen = false, className }: AccordionItemProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <div className={cn("overflow-hidden transition-all", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-4 text-left font-bold text-slate-900 outline-none transition-all hover:text-indigo-600 focus:text-indigo-600"
      >
        <span className="flex items-center gap-3">{title}</span>
        <ChevronDown 
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-300", 
            isOpen ? "rotate-180 text-indigo-500" : "text-slate-400"
          )} 
        />
      </button>
      <div 
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="pb-6 pt-1 text-sm text-slate-600 leading-relaxed">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
