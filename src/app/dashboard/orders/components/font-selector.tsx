"use client";
import { getMessages } from "@/i18n/getMessages";

import { useState, useRef, useEffect, useCallback } from "react";
import { Check, ChevronsUpDown, Search, Settings2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { getActiveFontItems, FontCatalogItem } from "@/lib/font-catalog";
import { FontManagerDialog } from "./font-manager-dialog";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

interface FontSelectorProps {
    value: string;
    onValueChange: (value: string) => void;
    className?: string;
    label?: string;
}

export function FontSelector({ value, onValueChange, className, label }: FontSelectorProps) {
    const locale = usePreferredLocale();
    const tf = getMessages(locale).tenantFlows;
    const isKo = toBaseLocale(locale) === "ko";    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [fontManagerOpen, setFontManagerOpen] = useState(false);
    const [fonts, setFonts] = useState<FontCatalogItem[]>([]);
    const searchRef = useRef<HTMLInputElement>(null);

    const loadFonts = useCallback(() => {
        setFonts(getActiveFontItems());
    }, []);

    useEffect(() => {
        loadFonts();
    }, [loadFonts]);

    const selectedLabel = fonts.find((font) => font.family === value)?.name || value;
    const fontUrls = fonts.map(f => f.url);

    const filteredFonts = fonts.filter((font) =>
        font.name.toLowerCase().includes(search.toLowerCase()) ||
        font.family.toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        if (open) {
            setSearch("");
            setTimeout(() => searchRef.current?.focus(), 100);
        }
    }, [open]);

    const handleSelect = (fontFamily: string) => {
        onValueChange(fontFamily);
        setOpen(false);
    };

    return (
        <div className={cn("flex flex-col gap-1.5", className)}>
            {fontUrls.map((url, i) => (
                <link key={i} rel="stylesheet" href={url} />
            ))}

            {label && <span className="text-sm font-medium leading-none">{label}</span>}

            <div className="flex gap-1">
                <Popover open={open} onOpenChange={setOpen} modal={false}>
                    <PopoverTrigger
                        render={
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={open}
                                className="flex-1 justify-between font-normal h-9 bg-white"
                                style={{ fontFamily: `'${value}'` }}
                            />
                        }
                    >
                        {selectedLabel}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </PopoverTrigger>
                    <PopoverContent
                        className="w-[280px] p-0"
                        align="start"
                    >
                        <div className="flex items-center border-b px-3">
                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                            <input
                                ref={searchRef}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={tf.f00737}
                                className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                            />
                        </div>
                        <div
                            className="p-1"
                            style={{ maxHeight: '250px', overflowY: 'auto' }}
                        >
                            {filteredFonts.length === 0 ? (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                    {tf.f00743}
                                </div>
                            ) : (
                                filteredFonts.map((font) => (
                                    <button
                                        key={font.family}
                                        type="button"
                                        onClick={() => handleSelect(font.family)}
                                        className={cn(
                                            "relative flex w-full items-center rounded-sm px-2 py-2 text-sm outline-none cursor-pointer",
                                            "hover:bg-accent hover:text-accent-foreground",
                                            value === font.family && "bg-accent"
                                        )}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4 shrink-0",
                                                value === font.family ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <div className="flex flex-col flex-1 text-left">
                                            <span style={{ fontFamily: `'${font.family}', sans-serif` }}>
                                                {font.name}
                                            </span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                        <div className="border-t p-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setOpen(false);
                                    setFontManagerOpen(true);
                                }}
                                className="flex w-full items-center rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                            >
                                <Settings2 className="mr-2 h-3.5 w-3.5" />
                                {tf.f00738}
                            </button>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            <FontManagerDialog
                isOpen={fontManagerOpen}
                onOpenChange={setFontManagerOpen}
                onFontsChanged={loadFonts}
            />
        </div>
    );
}
