"use client";

import React from "react";
import { usePlacesWidget } from "react-google-autocomplete";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

interface GoogleAddressSearchProps {
  apiKey: string;
  onAddressSelect: (address: string, district: string, zipCode: string) => void;
  placeholder?: string;
  className?: string;
  defaultValue?: string;
}

export function GoogleAddressSearch({ apiKey, onAddressSelect, placeholder, className, defaultValue }: GoogleAddressSearchProps) {
  const { ref } = usePlacesWidget<HTMLInputElement>({
    apiKey,
    onPlaceSelected: (place) => {
      if (!place || !place.address_components) return;

      const fullAddress = place.formatted_address || place.name || "";
      let zipCode = "";
      let district = "";
      let sublocality = "";
      let locality = "";

      for (const component of place.address_components) {
        if (component.types.includes("postal_code")) {
          zipCode = component.long_name;
        }
        if (component.types.includes("sublocality") || component.types.includes("sublocality_level_1")) {
          sublocality = component.long_name;
        }
        if (component.types.includes("locality")) {
          locality = component.long_name;
        }
        if (component.types.includes("administrative_area_level_2")) {
          district = component.long_name;
        }
      }

      // Priority: sublocality -> locality -> district
      const selectedDistrict = sublocality || locality || district || "";

      onAddressSelect(fullAddress, selectedDistrict, zipCode);
    },
    options: {
      types: ["geocode", "establishment"],
    },
  });

  if (!apiKey) {
    return (
      <Input
        placeholder="구글 API 키가 없습니다 (수동 입력)"
        className={className}
        defaultValue={defaultValue}
        onChange={(e) => onAddressSelect(e.target.value, "", "")}
      />
    );
  }

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      <Input
        ref={ref as any}
        placeholder={placeholder || "주소를 검색하세요"}
        defaultValue={defaultValue}
        className={`pl-9 ${className}`}
        onChange={(e) => {
          // Allow manual typing update just in case they don't select
          onAddressSelect(e.target.value, "", "");
        }}
      />
    </div>
  );
}
