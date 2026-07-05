"use client"

import { create } from "zustand"

type CheckoutState = {
  deliveryMethod: 'inside' | 'gazipur' | 'outside'
  setDeliveryMethod: (method: 'inside' | 'gazipur' | 'outside') => void
  couponCode: string
  setCouponCode: (code: string) => void
  clearCoupon: () => void
}

export const useCheckoutStore = create<CheckoutState>((set) => ({
  deliveryMethod: 'inside',
  setDeliveryMethod: (method) => set({ deliveryMethod: method }),
  couponCode: '',
  setCouponCode: (couponCode) => set({ couponCode: couponCode.trim().toUpperCase() }),
  clearCoupon: () => set({ couponCode: '' }),
}))







