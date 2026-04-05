"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

interface SearchParamsHandlerProps {
  onPriceFound: (price: number) => void;
}

export function SearchParamsHandler({ onPriceFound }: SearchParamsHandlerProps) {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const priceParam = searchParams.get("price");
    if (priceParam) {
      const parsed = parseInt(priceParam, 10);
      if (!isNaN(parsed)) {
        onPriceFound(parsed);
      }
    }
  }, [searchParams, onPriceFound]);

  return null;
}
