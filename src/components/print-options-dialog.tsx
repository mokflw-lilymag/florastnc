"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import { Printer, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { PAPER_PRESETS, PaperPreset } from "@/app/dashboard/print-labels/components/paper-presets"
import { getItemData } from "@/lib/data-fetch"

interface PrintOptionsDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onSubmit: (data: { items: { id: string; quantity: number }[]; startPosition: number; presetId: string }) => void
  targetIds: string[]
}

interface ItemWithQuantity {
  id: string
  name: string
  quantity: number
}

export function PrintOptionsDialog({ isOpen, onOpenChange, onSubmit, targetIds }: PrintOptionsDialogProps) {
  const [items, setItems] = useState<ItemWithQuantity[]>([])
  const [startPosition, setStartPosition] = useState(1)
  const [selectedPreset, setSelectedPreset] = useState<PaperPreset>(PAPER_PRESETS[0])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    if (isOpen && targetIds.length > 0) {
      const fetchItems = async () => {
        setLoading(true)
        const fetched = await Promise.all(
          targetIds.map(async (id) => {
            const itemData = await getItemData(id, 'material')
            return { id, name: itemData?.name || 'Unknown', quantity: 1 }
          })
        )
        setItems(fetched)
        setStartPosition(1)
        setSelectedPreset(PAPER_PRESETS[0])
        setErrorMsg("")
        setLoading(false)
      }
      fetchItems()
    }
  }, [isOpen, targetIds])

  const handleQuantityChange = (id: string, qty: number) => {
    const newQty = Math.max(1, qty)
    setItems(prev => prev.map(item => item.id === id ? { ...item, quantity: newQty } : item))
  }

  // 용지 변경 시 시작 위치 초기화
  const handlePresetChange = (preset: PaperPreset) => {
    setSelectedPreset(preset)
    setStartPosition(1)
    setErrorMsg("")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const max = selectedPreset.totalLabels
    if (startPosition < 1 || startPosition > max) {
      setErrorMsg(`시작 위치는 1에서 ${max} 사이여야 합니다.`)
      return
    }
    onSubmit({
      items: items.map(({ id, quantity }) => ({ id, quantity })),
      startPosition,
      presetId: selectedPreset.id
    })
  }

  const formtecPresets = PAPER_PRESETS.filter(p => p.type === 'formtec')
  const rollPresets = PAPER_PRESETS.filter(p => p.type === 'roll')
  const isFormtec = selectedPreset.type === 'formtec'

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg border-none shadow-2xl bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-500">
            🖨️ 다중 라벨 인쇄 옵션
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-xs">
            선택한 항목들의 인쇄 수량과 시작 위치를 지정하세요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-1">
          {/* 1. 용지 프리셋 선택 */}
          <div className="space-y-2">
            <Label className="font-bold text-slate-700 text-sm">📄 폼텍 / A4 용지 선택</Label>
            <div className="grid grid-cols-1 gap-1.5">
              {formtecPresets.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetChange(preset)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg border text-left text-sm transition-all",
                    selectedPreset.id === preset.id
                      ? "border-primary bg-primary/5 text-primary font-semibold shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                    selectedPreset.id === preset.id ? "border-primary bg-primary" : "border-slate-300"
                  )}>
                    {selectedPreset.id === preset.id && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <div>
                    <div className="font-semibold">{preset.name}</div>
                    <div className="text-xs text-slate-400">{preset.columns}열 × {preset.rows}행 = 총 {preset.totalLabels}칸</div>
                  </div>
                </button>
              ))}
            </div>

            <Label className="font-bold text-slate-700 text-sm pt-1 block">🏷️ 롤 라벨 (감열지)</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {rollPresets.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetChange(preset)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-sm transition-all",
                    selectedPreset.id === preset.id
                      ? "border-primary bg-primary/5 text-primary font-semibold shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                    selectedPreset.id === preset.id ? "border-primary bg-primary" : "border-slate-300"
                  )}>
                    {selectedPreset.id === preset.id && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <div>
                    <div className="font-semibold text-xs">{preset.name}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. 인쇄할 항목 및 개별 수량 선택 */}
          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700 text-sm">🔢 인쇄할 항목 및 수량</Label>
            <ScrollArea className="h-40 w-full rounded-lg border border-slate-200 p-3 bg-slate-50/50">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
                      <div className="h-8 w-20 bg-slate-200 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                      <span className="text-xs font-medium text-slate-800 line-clamp-1 pr-2">{item.name}</span>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                        className="w-20 h-8 text-center text-xs border-slate-200 font-bold bg-white"
                      />
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* 3. 시작 위치 — 폼텍일 때만 표시 */}
          {isFormtec && (
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 text-sm">
                📌 시작 위치 선택 — 선택된 칸부터 인쇄됩니다
              </Label>
              <p className="text-[11px] text-slate-400">앞부분 라벨을 이미 일부 사용한 경우, 남은 빈 칸 번호를 선택하세요.</p>

              {/* 폼텍 용지 미리보기 그리드 */}
              <div
                className="border-2 border-slate-300 rounded-md bg-slate-50 p-2 shadow-inner"
                style={{ aspectRatio: `${selectedPreset.columns} / ${selectedPreset.rows * 0.38}` }}
              >
                <div
                  className="grid h-full gap-0.5"
                  style={{ gridTemplateColumns: `repeat(${selectedPreset.columns}, 1fr)` }}
                >
                  {Array.from({ length: selectedPreset.totalLabels }).map((_, i) => {
                    const position = i + 1;
                    const isSelected = startPosition === position;
                    const isPast = position < startPosition;
                    return (
                      <button
                        key={position}
                        type="button"
                        onClick={() => { setStartPosition(position); setErrorMsg(""); }}
                        className={cn(
                          "rounded-sm border text-[9px] font-bold flex items-center justify-center transition-all leading-none",
                          isSelected
                            ? "bg-primary text-white border-primary shadow-md scale-105 z-10 relative"
                            : isPast
                            ? "bg-slate-200 text-slate-400 border-slate-300 cursor-pointer hover:bg-slate-300"
                            : "bg-white text-slate-500 border-slate-200 hover:border-primary hover:text-primary hover:bg-primary/5 cursor-pointer"
                        )}
                        style={{ minHeight: '22px' }}
                        title={`${position}번 칸`}
                      >
                        {position}
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="text-[11px] text-slate-500 text-center">
                {startPosition}번 칸부터 인쇄 · 총 {selectedPreset.totalLabels}칸 중 최대 {selectedPreset.totalLabels - startPosition + 1}칸 사용 가능
              </p>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs font-bold text-red-500">{errorMsg}</p>
          )}

          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>취소</Button>
            <Button type="submit" className="bg-primary text-white hover:bg-primary/90 font-bold" disabled={loading}>
              <Printer className="mr-2 h-4 w-4" /> 미리보기 이동
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}