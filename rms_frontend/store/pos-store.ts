import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Customer, CreateCustomerData, createCustomer, searchCustomers, lookupCustomerByPhone } from '@/lib/api/customer';
import { Product } from '@/types/inventory';
import { PaymentMethod } from '@/types/sales';
import { createSale } from '@/lib/api/sales';
import { Sale } from '@/types/sales';

export interface CartItem {
    id: number;
    productId: number;
    name: string;
    price: number;
    quantity: number;
    size: string;
    color: string;
    image: string;
    discount?: {
        type: "percentage" | "fixed";
        value: number;
    };
}

export interface HeldCart {
    id: string;
    createdAt: string;
    note?: string;
    customer: Customer | null;
    cart: CartItem[];
    cartDiscount: { type: "percentage" | "fixed"; value: number } | null;
    total: number;
}

interface POSState {
    // Customer related state
    showNewCustomerForm: boolean;
    setShowNewCustomerForm: (show: boolean) => void;
    newCustomer: CreateCustomerData;
    setNewCustomer: (customer: CreateCustomerData) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    searchResults: Customer[];
    setSearchResults: (results: Customer[]) => void;
    selectedCustomer: Customer | null;
    setSelectedCustomer: (customer: Customer | null) => void;
    handleSearch: (query: string) => Promise<void>;
    handleAddNewCustomer: () => Promise<void>;
    resetNewCustomer: () => void;

    // Cart related state
    cart: CartItem[];
    setCart: (cart: CartItem[]) => void;
    cartDiscount: { type: "percentage" | "fixed"; value: number } | null;
    setCartDiscount: (discount: { type: "percentage" | "fixed"; value: number } | null) => void;
    handleAddToCart: (product: Product, size: string, color: string) => void;
    handleUpdateQuantity: (itemId: number, change: number) => void;
    handleRemoveItem: (itemId: number) => void;
    handleClearCart: () => void;
    handleItemDiscount: (itemId: number, discountType: "percentage" | "fixed", discountValue: number) => void;
    handleRemoveItemDiscount: (itemId: number) => void;

    // Held Carts / Transactions State
    heldCarts: HeldCart[];
    showHeldCartsModal: boolean;
    setShowHeldCartsModal: (show: boolean) => void;
    holdCurrentCart: (note?: string) => boolean;
    resumeHeldCart: (heldId: string) => void;
    deleteHeldCart: (heldId: string) => void;
    clearAllHeldCarts: () => void;

    // Payment & Checkout State
    isProcessingSale: boolean;
    paymentMethod: PaymentMethod;
    setPaymentMethod: (method: PaymentMethod) => void;
    showSplitPayment: boolean;
    setShowSplitPayment: (show: boolean) => void;
    splitPayments: { method: PaymentMethod; amount: string }[];
    setSplitPayments: (payments: { method: PaymentMethod; amount: string }[]) => void;
    cashAmount: string;
    setCashAmount: (amount: string) => void;
    currentSaleData: Partial<Sale> | null;
    setCurrentSaleData: (data: Partial<Sale> | null) => void;

    // UI state
    showCustomerSearch: boolean;
    setShowCustomerSearch: (show: boolean) => void;
    showDiscountModal: boolean;
    setShowDiscountModal: (show: boolean) => void;
    showReceiptModal: boolean;
    setShowReceiptModal: (show: boolean) => void;
    receiptData: {
        id: string;
        date: string;
        items: CartItem[];
        subtotal: number;
        discountedSubtotal?: number;
        itemDiscounts: number;
        globalDiscount: number;
        tax: number;
        total: number;
        paymentMethod: PaymentMethod;
        cashAmount: number | null;
        changeDue: number | null;
        customer: Customer | null;
        splitPayments: { method: PaymentMethod; amount: string }[] | null;
        storeCredit?: number;
        isPaid: boolean;
        isDue?: boolean;
    } | null;
    setReceiptData: (data: POSState['receiptData']) => void;
    handleCompletePayment: (toast: (props: { title: string; description: string; variant?: "default" | "destructive" }) => void, markAsDue?: boolean) => Promise<Sale | undefined>;
}

const initialNewCustomer: CreateCustomerData = {
    first_name: '',
    phone: '',
};

export const usePOSStore = create<POSState>()(
    persist(
        (set, get) => ({
            // Customer related state
            showNewCustomerForm: false,
            setShowNewCustomerForm: (show) => set({ showNewCustomerForm: show }),

            newCustomer: initialNewCustomer,
            setNewCustomer: (customer) => set({ newCustomer: customer }),

            searchQuery: '',
            setSearchQuery: (query) => set({ searchQuery: query }),

            searchResults: [],
            setSearchResults: (results) => set({ searchResults: results }),

            selectedCustomer: null,
            setSelectedCustomer: (customer) => set({ selectedCustomer: customer }),

            handleSearch: async (query) => {
                try {
                    const response = await searchCustomers(query);
                    set({ searchResults: response.results || [] });
                } catch (error) {
                    console.error('Error searching customers:', error);
                    set({ searchResults: [] });
                }
            },

            handleAddNewCustomer: async () => {
                const { newCustomer } = get();
                try {
                    const existingCustomer = await lookupCustomerByPhone(newCustomer.phone);
                    if (existingCustomer) {
                        return;
                    }

                    const createdCustomer = await createCustomer(newCustomer);
                    set({
                        selectedCustomer: createdCustomer,
                        showNewCustomerForm: false,
                        newCustomer: initialNewCustomer,
                    });
                } catch (error) {
                    console.error('Error adding customer:', error);
                    throw error;
                }
            },

            resetNewCustomer: () => set({ newCustomer: initialNewCustomer }),

            // Cart related state
            cart: [],
            setCart: (cart) => set({ cart }),

            cartDiscount: null,
            setCartDiscount: (discount) => set({ cartDiscount: discount }),

            handleAddToCart: (product, size, color) => {
                const { cart } = get();
                const existingItem = cart.find(
                    item => item.productId === product.id && item.size === size && item.color === color
                );

                if (existingItem) {
                    const updatedCart = cart.map(item =>
                        item.id === existingItem.id
                            ? { ...item, quantity: item.quantity + 1 }
                            : item
                    );
                    set({ cart: updatedCart });
                } else {
                    const newItem: CartItem = {
                        id: Date.now(),
                        productId: product.id,
                        name: product.name,
                        price: Number(product.selling_price),
                        quantity: 1,
                        size,
                        color,
                        image: product.image || '/placeholder.svg',
                    };
                    set({ cart: [...cart, newItem] });
                }
            },

            handleUpdateQuantity: (itemId, change) => {
                const { cart } = get();
                const updatedCart = cart.map(item => {
                    if (item.id === itemId) {
                        const newQuantity = Math.max(1, item.quantity + change);
                        return { ...item, quantity: newQuantity };
                    }
                    return item;
                });
                set({ cart: updatedCart });
            },

            handleRemoveItem: (itemId) => {
                const { cart } = get();
                set({ cart: cart.filter(item => item.id !== itemId) });
            },

            handleClearCart: () => {
                set({ cart: [], cartDiscount: null });
            },

            handleItemDiscount: (itemId, discountType, discountValue) => {
                const { cart } = get();
                const updatedCart = cart.map(item => {
                    if (item.id === itemId) {
                        const discountAmount = discountType === "percentage"
                            ? (item.price * item.quantity) * (discountValue / 100)
                            : discountValue;
                        const discountedTotal = (item.price * item.quantity) - discountAmount;
                        return {
                            ...item,
                            discount: { type: discountType, value: Number(discountValue) },
                            total: discountedTotal,
                        };
                    }
                    return item;
                });
                set({ cart: updatedCart });
            },

            handleRemoveItemDiscount: (itemId) => {
                const { cart } = get();
                const updatedCart = cart.map(item => {
                    if (item.id === itemId) {
                        const { discount, ...rest } = item;
                        return rest;
                    }
                    return item;
                });
                set({ cart: updatedCart });
            },

            // Held Transactions / Drafts
            heldCarts: [],
            showHeldCartsModal: false,
            setShowHeldCartsModal: (show) => set({ showHeldCartsModal: show }),

            holdCurrentCart: (note = '') => {
                const { cart, selectedCustomer, cartDiscount, heldCarts } = get();
                if (cart.length === 0) return false;

                const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
                const discountAmount = cartDiscount
                    ? cartDiscount.type === 'percentage'
                        ? subtotal * (cartDiscount.value / 100)
                        : cartDiscount.value
                    : 0;

                const newHeldCart: HeldCart = {
                    id: `hold_${Date.now()}`,
                    createdAt: new Date().toISOString(),
                    note,
                    customer: selectedCustomer,
                    cart: [...cart],
                    cartDiscount: cartDiscount ? { ...cartDiscount } : null,
                    total: Math.max(0, subtotal - discountAmount),
                };

                set({
                    heldCarts: [newHeldCart, ...heldCarts],
                    cart: [],
                    cartDiscount: null,
                    selectedCustomer: null,
                });
                return true;
            },

            resumeHeldCart: (heldId: string) => {
                const { heldCarts } = get();
                const target = heldCarts.find(h => h.id === heldId);
                if (!target) return;

                set({
                    cart: target.cart,
                    cartDiscount: target.cartDiscount,
                    selectedCustomer: target.customer,
                    heldCarts: heldCarts.filter(h => h.id !== heldId),
                    showHeldCartsModal: false,
                });
            },

            deleteHeldCart: (heldId: string) => {
                const { heldCarts } = get();
                set({ heldCarts: heldCarts.filter(h => h.id !== heldId) });
            },

            clearAllHeldCarts: () => set({ heldCarts: [] }),

            // Payment & Checkout State
            isProcessingSale: false,
            paymentMethod: "cash",
            setPaymentMethod: (method) => set({ paymentMethod: method }),
            showSplitPayment: false,
            setShowSplitPayment: (show) => set({ showSplitPayment: show }),
            splitPayments: [{ method: 'cash' as PaymentMethod, amount: '' }],
            setSplitPayments: (payments) => set({ splitPayments: payments }),
            cashAmount: "",
            setCashAmount: (amount) => set({ cashAmount: amount }),
            currentSaleData: null,
            setCurrentSaleData: (data) => set({ currentSaleData: data }),

            // UI state
            showCustomerSearch: false,
            setShowCustomerSearch: (show) => set({ showCustomerSearch: show }),
            showDiscountModal: false,
            setShowDiscountModal: (show) => set({ showDiscountModal: show }),
            showReceiptModal: false,
            setShowReceiptModal: (show) => set({ showReceiptModal: show }),
            receiptData: null,
            setReceiptData: (data) => set({ receiptData: data }),

            handleCompletePayment: async (toast, markAsDue = false) => {
                const state = get();
                if (state.isProcessingSale) return;

                const { cart, selectedCustomer, paymentMethod, cashAmount, splitPayments, cartDiscount } = state;
                if (cart.length === 0) {
                    toast({
                        title: "Empty Cart",
                        description: "Your cart is empty",
                        variant: "destructive",
                    });
                    return;
                }

                set({ isProcessingSale: true });

                try {
                    // Calculate item totals and discounts
                    const itemsWithDiscounts = cart.map(item => {
                        const itemTotal = item.price * item.quantity;
                        const itemDiscount = item.discount ? (item.discount.type === 'percentage'
                            ? itemTotal * (item.discount.value / 100)
                            : item.discount.value) : 0;
                        const discountedTotal = itemTotal - itemDiscount;
                        return {
                            ...item,
                            itemTotal,
                            itemDiscount,
                            discountedTotal,
                        };
                    });

                    const subtotalBeforeDiscount = itemsWithDiscounts.reduce((sum, item) => sum + item.itemTotal, 0);
                    const totalItemDiscounts = itemsWithDiscounts.reduce((sum, item) => sum + item.itemDiscount, 0);

                    const globalDiscount = cartDiscount ? (cartDiscount.type === 'percentage'
                        ? subtotalBeforeDiscount * (cartDiscount.value / 100)
                        : cartDiscount.value) : 0;

                    const subtotal = subtotalBeforeDiscount - totalItemDiscounts - globalDiscount;
                    const tax = 0;
                    const total = Math.max(0, subtotal);

                    // Prepare payment data
                    let paymentData: any[] = [];
                    if (markAsDue) {
                        paymentData = [];
                    } else if (paymentMethod === "split") {
                        paymentData = splitPayments
                            .filter(payment => payment.amount && parseFloat(payment.amount) > 0)
                            .map(payment => ({
                                method: payment.method,
                                amount: payment.amount,
                                notes: `Split payment - ${payment.method}`,
                            }));
                    } else if (paymentMethod === "cash") {
                        const cashAmountNum = parseFloat(cashAmount) || total;
                        paymentData = [{
                            method: "cash",
                            amount: cashAmountNum.toString(),
                            notes: "Cash payment",
                        }];
                    } else if (["card", "mobile", "gift"].includes(paymentMethod)) {
                        paymentData = [{
                            method: paymentMethod,
                            amount: total.toString(),
                            notes: `${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)} payment`,
                        }];
                    }

                    // Client-generated unique idempotency key
                    const idempotencyKey = `pos_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

                    const saleData: Partial<Sale> = {
                        idempotency_key: idempotencyKey,
                        customer: selectedCustomer?.id,
                        customer_phone: selectedCustomer?.phone,
                        subtotal: subtotalBeforeDiscount,
                        tax,
                        discount: globalDiscount,
                        total,
                        payment_method: markAsDue ? "credit" : paymentMethod,
                        ...(markAsDue ? { payment_data: [] } : { payment_data: paymentData }),
                        items: itemsWithDiscounts.map(item => ({
                            product_id: item.productId,
                            size: item.size,
                            color: item.color,
                            quantity: item.quantity,
                            unit_price: item.price,
                            discount: item.itemDiscount,
                            total: item.discountedTotal,
                        })),
                    };

                    const sale = await createSale(saleData);

                    if (!sale.id) {
                        throw new Error('Sale ID not returned from API');
                    }

                    const receipt = {
                        id: sale.invoice_number || `INV-${Math.floor(100000 + Math.random() * 900000)}`,
                        date: new Date().toISOString(),
                        items: itemsWithDiscounts,
                        subtotal: subtotalBeforeDiscount,
                        discountedSubtotal: subtotalBeforeDiscount - totalItemDiscounts,
                        itemDiscounts: totalItemDiscounts,
                        globalDiscount,
                        tax,
                        total,
                        paymentMethod: markAsDue ? "credit" : paymentMethod,
                        cashAmount: paymentMethod === "cash" && !markAsDue ? Number.parseFloat(cashAmount) : null,
                        changeDue: paymentMethod === "cash" && !markAsDue ? Number.parseFloat(cashAmount) - total : null,
                        customer: selectedCustomer,
                        splitPayments: paymentMethod === "split" && !markAsDue ? splitPayments : null,
                        storeCredit: 0,
                        isPaid: !markAsDue,
                        isDue: markAsDue,
                    };

                    set({
                        receiptData: receipt,
                        showReceiptModal: true,
                        cart: [],
                        cartDiscount: null,
                    });

                    toast({
                        title: markAsDue ? "Sale Created as Due" : "Success",
                        description: markAsDue ? "Sale created with pending payment" : "Payment processed successfully",
                    });

                    return sale;
                } catch (error) {
                    console.error('Error processing payment:', error);
                    const errorMessage = error instanceof Error ? error.message : "Failed to process payment";
                    toast({
                        title: "Error",
                        description: errorMessage,
                        variant: "destructive",
                    });
                    throw error;
                } finally {
                    set({ isProcessingSale: false });
                }
            },
        }),
        {
            name: 'rms_pos_terminal_v1',
            partialize: (state) => ({
                cart: state.cart,
                selectedCustomer: state.selectedCustomer,
                cartDiscount: state.cartDiscount,
                paymentMethod: state.paymentMethod,
                heldCarts: state.heldCarts,
            }),
        }
    )
);