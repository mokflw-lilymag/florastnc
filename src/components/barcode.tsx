"use client";
import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeProps {
  value: string;
  options: JsBarcode.Options & { text?: string };
}

export function Barcode({ value, options }: BarcodeProps) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (ref.current && value) {
      ref.current.innerHTML = '';
      try {
        JsBarcode(ref.current, value, options);
      } catch (err) {
        console.error("Barcode rendering error for value:", value, err);
        ref.current.innerHTML = `<text x="5" y="15" font-family="sans-serif" font-size="10" fill="#ef4444">[바코드 오류: ${value}]</text>`;
      }
    }
  }, [value, options]);

  return <svg ref={ref} key={value} />;
};
