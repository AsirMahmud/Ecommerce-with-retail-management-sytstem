"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCheckoutStore } from "@/hooks/useCheckoutStore"

export function CouponInput({ appliedCode, error }: { appliedCode?: string; error?: string | null }) {
  const { couponCode, setCouponCode, clearCoupon } = useCheckoutStore()
  const [draft, setDraft] = useState(couponCode)

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
        <span><strong>{appliedCode}</strong> applied</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => { clearCoupon(); setDraft("") }}>Remove</Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input value={draft} onChange={(e) => setDraft(e.target.value.toUpperCase())} placeholder="Coupon code" aria-label="Coupon code" />
        <Button type="button" variant="outline" disabled={!draft.trim()} onClick={() => setCouponCode(draft)}>Apply</Button>
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  )
}
