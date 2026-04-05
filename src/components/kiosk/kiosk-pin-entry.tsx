"use client";

import React, { useState } from "react";
import { Store, Delete, X } from "lucide-react";

interface KioskPinEntryProps {
  onComplete: (pin: string) => void;
}

export function KioskPinEntry({ onComplete }: KioskPinEntryProps) {
  const [pin, setPin] = useState("");
  const [active, setActive] = useState<number | string | null>(null);

  const handleInput = (val: number | string) => {
    setActive(val);
    setTimeout(() => setActive(null), 100);

    if (val === "X") {
      setPin("");
    } else if (val === "D") {
      setPin(prev => prev.slice(0, -1));
    } else {
      setPin(prev => {
        if (prev.length >= 3) return prev;
        const next = prev + String(val);
        if (next.length === 3) {
          setTimeout(() => onComplete(next), 150);
        }
        return next;
      });
    }
  };

  return (
    <div className="w-full max-w-sm space-y-8 animate-in fade-in duration-500 font-sans select-none">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center shadow-lg">
            <Store className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Florasync Kiosk</h1>
        <p className="text-slate-500 font-semibold tracking-tight">직원 화면의 3자리 핀번호를 입력해주세요</p>
      </div>

      <div className="flex justify-center gap-4 mb-10">
        {[0, 1, 2].map((i) => {
          const digit = pin.charAt(i);
          const hasVal = digit !== "";
          return (
            <div 
              key={`pin-display-${i}`}
              className={`w-20 h-28 rounded-3xl border-4 flex flex-col items-center justify-center text-5xl font-black transition-all duration-75
                ${hasVal ? 'border-emerald-600 bg-white text-slate-950 scale-105 shadow-2xl' : 'border-slate-200 bg-white text-transparent'}`}
            >
              <span className="relative z-10">{digit}</span>
              {/* [DEBUG] Visual indicator if text fails to render */}
              {hasVal && <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full mt-1" />}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-5 px-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, "X", 0, "D"].map((val) => {
          const isDelete = val === "D";
          const isClear = val === "X";
          const isActive = active === val;
          
          return (
            <button
              key={`keypad-${val}`}
              type="button"
              onClick={() => handleInput(val)}
              className={`h-22 aspect-square text-4xl font-bold rounded-3xl border-2 transition-all duration-75 flex items-center justify-center shadow-md select-none touch-auto
                ${isActive ? 'bg-emerald-600 text-white border-emerald-600 scale-90' : 'bg-white text-slate-900 border-slate-100 active:bg-slate-50'}
                ${isClear ? 'text-red-500' : ''}
                ${isDelete ? 'text-slate-500' : ''}`}
            >
              {isDelete ? <Delete className="w-10 h-10" /> : isClear ? <X className="w-10 h-10" /> : val}
            </button>
          );
        })}
      </div>
    </div>
  );
}
