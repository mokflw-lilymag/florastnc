"use client";
import { getMessages } from "@/i18n/getMessages";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Plus, Minus, Wand2, Check, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    FONT_CATALOG,
    FONT_CATEGORIES,
    FontCatalogItem,
    getActiveFonts,
    setActiveFonts,
} from "@/lib/font-catalog";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";

interface FontManagerDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onFontsChanged?: () => void;
}

export function FontManagerDialog({ isOpen, onOpenChange, onFontsChanged }: FontManagerDialogProps) {
    const locale = usePreferredLocale();
    const tf = getMessages(locale).tenantFlows;
    const [activeFonts, setActiveFontsState] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (isOpen) {
            setActiveFontsState(getActiveFonts());
        }
    }, [isOpen]);

    const toggleFont = (family: string) => {
        setActiveFontsState(prev => {
            if (prev.includes(family)) {
                return prev.filter(f => f !== family);
            } else {
                return [...prev, family];
            }
        });
    };

    const handleSave = () => {
        setActiveFonts(activeFonts);
        onFontsChanged?.();
        onOpenChange(false);
    };

    const filteredFonts = FONT_CATALOG.filter(font => {
        const matchCategory = selectedCategory === 'all' || font.category === selectedCategory;
        const matchSearch = search === '' ||
            font.name.toLowerCase().includes(search.toLowerCase()) ||
            font.family.toLowerCase().includes(search.toLowerCase());
        return matchCategory && matchSearch;
    });

    const activeCounts = FONT_CATEGORIES.reduce((acc, cat) => {
        acc[cat.id] = activeFonts.filter(af =>
            FONT_CATALOG.find(f => f.family === af && f.category === cat.id)
        ).length;
        return acc;
    }, {} as Record<string, number>);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wand2 className="h-5 w-5 text-primary" />
                        {tf.f00739}
                    </DialogTitle>
                    <DialogDescription>
                        {tf.f00491}
                    </DialogDescription>
                </DialogHeader>

                {FONT_CATALOG.map((font, i) => (
                    <link key={i} rel="stylesheet" href={font.url} />
                ))}

                <div className="space-y-3 pb-3 border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={tf.f00740}
                            className="pl-9"
                        />
                    </div>

                    <div className="flex gap-1 flex-wrap">
                        <Button
                            type="button"
                            variant={selectedCategory === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedCategory('all')}
                        >
                            {tf.f00553} ({FONT_CATALOG.length})
                        </Button>
                        {FONT_CATEGORIES.map(cat => (
                            <Button
                                key={cat.id}
                                type="button"
                                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSelectedCategory(cat.id)}
                            >
                                {cat.icon} {cat.label}
                                {activeCounts[cat.id] > 0 && (
                                    <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-xs">
                                        {activeCounts[cat.id]}
                                    </Badge>
                                )}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 py-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {filteredFonts.map((font) => {
                            const isActive = activeFonts.includes(font.family);
                            return (
                                <button
                                    key={font.family}
                                    type="button"
                                    onClick={() => toggleFont(font.family)}
                                    className={cn(
                                        "relative flex flex-col items-start p-3 rounded-lg border-2 text-left transition-all",
                                        "hover:shadow-md hover:border-primary/50",
                                        isActive
                                            ? "border-primary bg-primary/5 shadow-sm"
                                            : "border-muted bg-card hover:bg-accent/30"
                                    )}
                                >
                                    <div className={cn(
                                        "absolute top-2 right-2 h-6 w-6 rounded-full flex items-center justify-center transition-all",
                                        isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                    )}>
                                        {isActive ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                                    </div>

                                    <div className="flex items-center gap-1.5 mb-1 pr-8">
                                        <span className="font-medium text-sm">{font.name}</span>
                                    </div>

                                    <div
                                        style={{ fontFamily: `'${font.family}', sans-serif`, fontSize: '18px', lineHeight: 1.4 }}
                                        className="text-foreground mb-1"
                                    >
                                        가나다라 마바사
                                    </div>
                                    <div
                                        style={{ fontFamily: `'${font.family}', sans-serif`, fontSize: '12px' }}
                                        className="text-muted-foreground"
                                    >
                                        {font.preview}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <DialogFooter className="pt-3 border-t">
                    <div className="flex-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <Star className="h-4 w-4" />
                        <span>{tf.f00777} <strong className="text-foreground">{activeFonts.length}</strong>{tf.f00025}</span>
                    </div>
                    <DialogClose render={<Button type="button" variant="secondary" />}>
                        {tf.f00702}
                    </DialogClose>
                    <Button type="button" onClick={handleSave}>
                        {tf.f00539}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
