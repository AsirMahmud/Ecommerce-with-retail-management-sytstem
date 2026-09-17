"use client";

import React, { useState } from "react";
import { Package, ShoppingBag } from "lucide-react";
import { getImageUrl } from "@/lib/utils";

interface OrderProductThumbnailProps {
  images?: string[];
  productName?: string;
  orderId?: number;
  className?: string;
}

export function OrderProductThumbnail({
  images = [],
  productName = "Product",
  orderId,
  className = "",
}: OrderProductThumbnailProps) {
  const [imgError, setImgError] = useState(false);
  const firstImage = images.find(Boolean);

  if (!firstImage || imgError) {
    return (
      <div
        className={`w-12 h-14 sm:w-14 sm:h-16 rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 flex flex-col items-center justify-center text-slate-400 shrink-0 shadow-2xs ${className}`}
        title={productName}
      >
        <Package className="w-5 h-5 text-indigo-400/80" />
        {orderId && (
          <span className="text-[9px] font-bold text-slate-400 font-mono mt-0.5">
            #{orderId}
          </span>
        )}
      </div>
    );
  }

  const resolvedUrl = getImageUrl(firstImage);
  const extraCount = images.length - 1;

  return (
    <div className="relative shrink-0 group">
      <div
        className={`w-12 h-14 sm:w-14 sm:h-16 rounded-xl border border-slate-200/90 bg-white overflow-hidden shrink-0 relative shadow-2xs group-hover:border-indigo-300 group-hover:shadow-xs transition-all ${className}`}
      >
        <img
          src={resolvedUrl}
          alt={productName}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {extraCount > 0 && (
          <div className="absolute bottom-1 right-1 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
            +{extraCount}
          </div>
        )}
      </div>
    </div>
  );
}
