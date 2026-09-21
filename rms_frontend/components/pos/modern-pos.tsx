"use client";

import { Label } from "@/components/ui/label";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  Tag,
  Filter,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  X,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  AlertCircle,
  PinIcon as PantsIcon,
  Shirt,
  Briefcase,
  Watch,
  Footprints,
  History,
  Percent,
  ScanLine,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import ProductGrid from "./ProductGrid";
import CustomerSearchModal from "./CustomerSearchModal";
import CustomerAddModal from "./CustomerAddModal";
import CartAndCheckout from "./CartAndCheckout";
import DiscountModal from "./DiscountModal";
import { usePOSStore } from "@/store/pos-store";
import { Product, ProductVariation } from "@/types/inventory";
import ReceiptModal from "./ReceiptModal";
import HeldCartsModal from "./held-carts-modal";
import { productsApi } from "@/lib/api/inventory";

// Sample product data

// Sample categories

// Sample customers

const productTags = [
  { id: "bestseller", name: "Bestseller", color: "bg-blue-100 text-blue-800" },
  {
    id: "new arrival",
    name: "New Arrival",
    color: "bg-green-100 text-green-800",
  },
  { id: "discounted", name: "Discounted", color: "bg-red-100 text-red-800" },
  { id: "premium", name: "Premium", color: "bg-purple-100 text-purple-800" },
  { id: "seasonal", name: "Seasonal", color: "bg-yellow-100 text-yellow-800" },
];

// Helper function to get tag color
const getTagColor = (tagId: string): string => {
  const tag = productTags.find((t) => t.id === tagId);
  return tag ? tag.color : "bg-gray-100 text-gray-800";
};

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("bn-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Cart item type
type CartItem = {
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
};

interface Tag {
  id: string;
  name: string;
}

interface SplitPayment {
  method: string;
  amount: string;
}

export function ModernPOS() {
  const { toast } = useToast();
  const {
    cart,
    handleAddToCart,
    handleUpdateQuantity,
    handleRemoveItem,
    handleClearCart,
    handleItemDiscount,
    handleRemoveItemDiscount,
    handleCompletePayment: completePayment,
    showReceiptModal,
    setShowReceiptModal,
    receiptData,
    setReceiptData,
  } = usePOSStore();

  // Note: We no longer fetch all products for scanning - we fetch from backend on each scan

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 300]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [cashAmount, setCashAmount] = useState("");
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [selectedSizes, setSelectedSizes] = useState<Record<number, string>>(
    {}
  );
  const [selectedColors, setSelectedColors] = useState<Record<number, string>>(
    {}
  );
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showSplitPayment, setShowSplitPayment] = useState(false);
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([
    { method: "card", amount: "" },
    { method: "cash", amount: "" },
  ]);
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [upsellProducts, setUpsellProducts] = useState<Product[]>([]);
  const [barcodeMode, setBarcodeMode] = useState(false); // Toggle barcode mode on/off
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [showProductHistory, setShowProductHistory] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [cartDiscount, setCartDiscount] = useState<{
    type: "percentage" | "fixed";
    value: number;
  } | null>(null);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [applyDuePayment, setApplyDuePayment] = useState(false);
  const [applyStoreCredit, setApplyStoreCredit] = useState(false);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);

  // Calculate cart totals
  const subtotal = cart.reduce((sum, item) => {
    const itemTotal = item.price * item.quantity;
    if (item.discount) {
      if (item.discount.type === "percentage") {
        return sum + itemTotal * (1 - item.discount.value / 100);
      } else {
        return sum + (itemTotal - item.discount.value);
      }
    }
    return sum + itemTotal;
  }, 0);

  // Remove tax calculation completely
  const tax = 0;
  let total = subtotal;

  // Apply cart-wide discount if any
  let discountedSubtotal = subtotal;
  if (cartDiscount) {
    if (cartDiscount.type === "percentage") {
      discountedSubtotal = subtotal * (1 - cartDiscount.value / 100);
    } else {
      discountedSubtotal = subtotal - cartDiscount.value;
    }
    total = discountedSubtotal;
  }

  // Apply store credit if selected
  if (selectedCustomer && applyStoreCredit && selectedCustomer.credit > 0) {
    if (selectedCustomer.credit >= total) {
      total = 0;
    } else {
      total -= selectedCustomer.credit;
    }
  }

  const changeDue = cashAmount ? Number.parseFloat(cashAmount) - total : 0;

  // Handle completing payment
  const handleCompletePayment = () => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to the cart before completing payment.",
        variant: "destructive",
      });
      return;
    }

    if (
      paymentMethod === "cash" &&
      (!cashAmount || Number.parseFloat(cashAmount) < total)
    ) {
      toast({
        title: "Insufficient Cash",
        description: "Please enter a cash amount that covers the total.",
        variant: "destructive",
      });
      return;
    }

    if (paymentMethod === "split") {
      const totalSplitAmount = splitPayments.reduce((sum, payment) => {
        return sum + (payment.amount ? Number.parseFloat(payment.amount) : 0);
      }, 0);

      if (Math.abs(totalSplitAmount - total) > 0.01) {
        toast({
          title: "Invalid Split Payment",
          description: "The split payment amounts must equal the total amount.",
          variant: "destructive",
        });
        return;
      }
    }

    // Handle due payment
    let isPaid = true;
    let updatedCustomer = selectedCustomer;

    if (applyDuePayment && selectedCustomer) {
      isPaid = false;

      // Update customer's due amount
      if (updatedCustomer) {
        updatedCustomer = {
          ...updatedCustomer,
          due: updatedCustomer.due + total,
          purchaseHistory: [
            {
              date: new Date().toISOString().split("T")[0],
              amount: total,
              items: cart.length,
              paid: false,
            },
            ...updatedCustomer.purchaseHistory,
          ],
        };
      }
    } else if (selectedCustomer) {
      // Add to customer's purchase history as paid
      updatedCustomer = {
        ...updatedCustomer,
        purchaseHistory: [
          {
            date: new Date().toISOString().split("T")[0],
            amount: total,
            items: cart.length,
            paid: true,
          },
          ...updatedCustomer.purchaseHistory,
        ],
      };
    }

    // Create receipt data
    const receipt = {
      id: `INV-${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date().toISOString(),
      items: cart,
      subtotal,
      discount: cartDiscount,
      discountedSubtotal,
      tax,
      total,
      paymentMethod,
      cashAmount:
        paymentMethod === "cash" ? Number.parseFloat(cashAmount) : null,
      changeDue: paymentMethod === "cash" ? changeDue : null,
      customer: updatedCustomer,
      splitPayments: paymentMethod === "split" ? splitPayments : null,
      storeCredit:
        applyStoreCredit && selectedCustomer ? selectedCustomer.credit : 0,
      isPaid,
    };

    // Add to sales history
    setSalesHistory((prev) => [receipt, ...prev]);

    setReceiptData(receipt);
    setShowReceiptModal(true);

    // Update the selected customer with new purchase history
    if (updatedCustomer) {
      setSelectedCustomer(updatedCustomer);
    }

    // In a real app, you would save this transaction to your backend
    console.log("Transaction completed:", receipt);

    completePayment(toast);
  };

  // Handle starting a new sale after receipt
  const handleNewSale = () => {
    handleClearCart();
    setSelectedCustomer(null);
    setPaymentMethod("card");
    setCashAmount("");
    setShowReceiptModal(false);
    setCartDiscount(null);
    setShowSplitPayment(false);
    setSplitPayments([
      { method: "card", amount: "" },
      { method: "cash", amount: "" },
    ]);
  };

  // Handle closing the receipt modal
  const handleCloseReceiptModal = () => {
    setShowReceiptModal(false);
  };

  // Filter products based on search, category, tags, and price range

  // Filter customers based on search query

  // Handle adding product to cart

  // Handle updating cart item quantity

  // Handle removing item from cart

  // Keep barcode input focused for continuous scanning when barcode mode is enabled
  // Only runs when barcodeMode is true, allowing normal input behavior when disabled
  useEffect(() => {
    if (!barcodeMode) return;

    const barcodeInput = barcodeInputRef.current;
    if (!barcodeInput) return;

    // Track if user is actively interacting with other inputs
    let shouldRefocus = true;
    let refocusTimeout: NodeJS.Timeout | null = null;

    // Check if element is an interactive input element or inside one
    const isInteractiveElement = (element: Element | null): boolean => {
      if (!element) return false;
      
      // Check if element itself is an input/textarea/select
      const tagName = element.tagName;
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
        return true;
      }
      
      // Check if element is contentEditable
      const htmlElement = element as HTMLElement;
      if (htmlElement.isContentEditable || htmlElement.contentEditable === 'true') {
        return true;
      }
      
      // Check if element is inside a dialog/modal (all inputs in modals should work)
      if (element.closest('[role="dialog"]') || 
          element.closest('[data-radix-portal]') ||
          element.closest('[data-state="open"]')) {
        return true;
      }
      
      // Check if element is inside an input/textarea/select (for labels, icons, etc.)
      const inputParent = element.closest('input, textarea, select');
      if (inputParent) {
        return true;
      }
      
      // Check if element is a button or inside a button
      const buttonParent = element.closest('button, [role="button"]');
      if (buttonParent && buttonParent !== barcodeInput) {
        return true;
      }
      
      // Check if it's inside a form field wrapper
      if (element.closest('[data-radix-select-trigger]') ||
          element.closest('[data-radix-dropdown-trigger]')) {
        return true;
      }
      
      return false;
    };

    // Clear any pending refocus timeout
    const clearRefocusTimeout = () => {
      if (refocusTimeout) {
        clearTimeout(refocusTimeout);
        refocusTimeout = null;
      }
    };

    // Check if any input/textarea/select is currently focused
    const isAnyInputFocused = (): boolean => {
      const activeElement = document.activeElement;
      if (!activeElement) return false;
      
      // Check if active element is an input, textarea, or select
      const tagName = activeElement.tagName;
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
        return activeElement !== barcodeInput;
      }
      
      // Check if it's inside any input field
      const htmlElement = activeElement as HTMLElement;
      if (htmlElement.isContentEditable || htmlElement.contentEditable === 'true') {
        return true;
      }
      
      // Check if it's inside a dialog/modal
      if (activeElement.closest('[role="dialog"]') || 
          activeElement.closest('[data-radix-portal]') ||
          activeElement.closest('[data-state="open"]')) {
        return true;
      }
      
      return false;
    };

    // Focus function that respects other inputs
    const attemptRefocus = () => {
      clearRefocusTimeout();
      
      // Only refocus if flag is set
      if (!shouldRefocus) return;
      
      // Double-check that no input is currently focused
      if (isAnyInputFocused()) {
        shouldRefocus = false;
        return;
      }
      
      const activeElement = document.activeElement;
      
      // Don't refocus if user is interacting with another input/textarea/select
      if (isInteractiveElement(activeElement) && activeElement !== barcodeInput) {
        shouldRefocus = false;
        return;
      }
      
      // Only refocus if no interactive element is focused or body/document is focused
      if (barcodeInput && activeElement !== barcodeInput) {
        if (!activeElement || 
            activeElement === document.body || 
            activeElement === document.documentElement ||
            activeElement.tagName === 'HTML') {
          // Final check before focusing
          if (!isAnyInputFocused()) {
            barcodeInput.focus();
          }
        }
      }
    };

    // Focus on mount only if nothing else is focused
    if (!document.activeElement || 
        document.activeElement === document.body || 
        document.activeElement === document.documentElement) {
      attemptRefocus();
    }

    // Handle focus events - disable refocus when other inputs are focused
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && target !== barcodeInput) {
        // Disable refocus immediately when any other element gets focus
        shouldRefocus = false;
        clearRefocusTimeout();
        
        // Check if it's an interactive element
        if (isInteractiveElement(target)) {
          // Definitely don't refocus while this input is focused
          return;
        }
      }
    };

    // Handle blur events - enable refocus when user leaves other inputs
    const handleBlur = (e: FocusEvent) => {
      const relatedTarget = e.relatedTarget as HTMLElement;
      
      // If user moved to another interactive element, don't refocus
      if (relatedTarget && 
          relatedTarget !== barcodeInput && 
          isInteractiveElement(relatedTarget)) {
        shouldRefocus = false;
        return;
      }
      
      // Wait a bit to check what actually got focus
      clearRefocusTimeout();
      refocusTimeout = setTimeout(() => {
        // Double-check that no input is focused
        if (!isAnyInputFocused()) {
          shouldRefocus = true;
          attemptRefocus();
        } else {
          shouldRefocus = false;
        }
      }, 150);
    };

    // Handle clicks - disable refocus if clicking on interactive elements
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Clear any pending refocus
      clearRefocusTimeout();
      
      // If clicking on or inside an interactive element, disable refocus
      if (isInteractiveElement(target)) {
        shouldRefocus = false;
        // Don't try to refocus while user is interacting
        return;
      }
      
      // Check if click is on an input (might not be caught by isInteractiveElement)
      const clickedInput = target.closest('input, textarea, select');
      if (clickedInput && clickedInput !== barcodeInput) {
        shouldRefocus = false;
        return;
      }
      
      // If clicking outside interactive areas, wait and then maybe refocus
      refocusTimeout = setTimeout(() => {
        // Only refocus if no input is currently focused
        if (!isAnyInputFocused()) {
          shouldRefocus = true;
          attemptRefocus();
        } else {
          shouldRefocus = false;
        }
      }, 250);
    };

    // Handle keyboard events - if typing in another input, disable refocus
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      
      // If typing in any element that's not the barcode input, disable refocus
      if (activeElement && activeElement !== barcodeInput) {
        // Check if it's an input/textarea/select
        const tagName = activeElement.tagName;
        if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
          shouldRefocus = false;
          clearRefocusTimeout();
          return;
        }
        
        // Check if it's contentEditable
        const htmlElement = activeElement as HTMLElement;
        if (htmlElement.isContentEditable || htmlElement.contentEditable === 'true') {
          shouldRefocus = false;
          clearRefocusTimeout();
          return;
        }
      }
    };

    // Add event listeners
    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('blur', handleBlur, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      clearRefocusTimeout();
      document.removeEventListener('focus', handleFocus, true);
      document.removeEventListener('blur', handleBlur, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [barcodeMode]);

  // Decode QR code data
  const decodeQRCodeData = (scannedValue: string): { productId: string; color: string; size: string } | null => {
    try {
      // Validate input
      if (!scannedValue || typeof scannedValue !== 'string' || scannedValue.trim().length === 0) {
        return null;
      }

      // Try to decode base64
      let decodedString: string;
      try {
        decodedString = atob(scannedValue.trim());
      } catch (decodeError) {
        // Not valid base64, probably a regular barcode
        return null;
      }

      // Validate decoded string is valid JSON
      if (!decodedString || decodedString.length === 0) {
        return null;
      }

      // Try to parse as JSON
      let cartData: any;
      try {
        cartData = JSON.parse(decodedString);
      } catch (parseError) {
        // Not valid JSON, probably a regular barcode
        return null;
      }
      
      // Check if it's our QR code format
      if (cartData && typeof cartData === 'object' && cartData.items && Array.isArray(cartData.items) && cartData.items.length > 0) {
        const item = cartData.items[0];
        if (item && typeof item === 'object' && item.productId && item.variations) {
          return {
            productId: String(item.productId),
            color: item.variations.color || "",
            size: item.variations.size || "",
          };
        }
      }
      return null;
    } catch (error) {
      // Not a valid QR code format, might be regular barcode
      console.error("Error decoding QR code:", error);
      return null;
    }
  };

  // Handle barcode/QR code scanning - fetches from backend
  const handleBarcodeScan = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    // Only process barcode scan if barcode mode is enabled
    if (!barcodeMode && event.key === "Enter") {
      // Normal search behavior - let it work as regular search
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const scannedValue = searchQuery.trim();
      if (!scannedValue) return;

      // Set processing flag and clear input immediately for next scan
      setIsProcessingScan(true);
      setSearchQuery("");

      // Process scan immediately (no delay needed since we already cleared input)
      try {
        // Try to decode as QR code first
        const qrData = decodeQRCodeData(scannedValue);
         
        if (qrData) {
          // It's a QR code - fetch product from backend by ID
          const productId = parseInt(qrData.productId);
          if (isNaN(productId)) {
            toast({
              title: "Invalid QR Code",
              description: "QR code contains invalid product ID",
              variant: "destructive",
            });
            setIsProcessingScan(false);
            return;
          }

          try {
            // Fetch product from backend
            const product = await productsApi.getById(productId);
            
            if (product) {
              // Verify variation exists
              const variation = product.variations?.find(
                (v: ProductVariation) =>
                  v.is_active &&
                  v.size === qrData.size &&
                  v.color === qrData.color
              );

              if (variation && variation.stock > 0) {
                handleAddToCart(product, qrData.size, qrData.color);
                toast({
                  title: "Added",
                  description: `${product.name}`,
                });
              } else {
                toast({
                  title: "Out of Stock",
                  description: `Variant unavailable`,
                  variant: "destructive",
                });
              }
            } else {
              toast({
                title: "Not Found",
                description: `Product ID ${qrData.productId}`,
                variant: "destructive",
              });
            }
          } catch (error) {
            toast({
              title: "Not Found",
              description: `Product ID ${qrData.productId} not found`,
              variant: "destructive",
            });
          }
          setIsProcessingScan(false);
        } else {
          // Try to find product by SKU or barcode from backend
          try {
            const product = await productsApi.searchByBarcode(scannedValue);
            
            if (product) {
              // Get first available variation
              const firstVariation = product.variations?.find((v: ProductVariation) => v.is_active && v.stock > 0);
              
              if (firstVariation) {
                handleAddToCart(product, firstVariation.size, firstVariation.color);
                toast({
                  title: "Added",
                  description: `${product.name}`,
                });
              } else {
                toast({
                  title: "Out of Stock",
                  description: `${product.name}`,
                  variant: "destructive",
                });
              }
            } else {
              // Not found - set it back as search query for text search
              setSearchQuery(scannedValue);
            }
          } catch (error) {
            console.error("Error fetching product by barcode:", error);
            // Not found - set it back as search query for text search
            setSearchQuery(scannedValue);
          }
          setIsProcessingScan(false);
        }
      } catch (error) {
        console.error("Error processing barcode scan:", error);
        toast({
          title: "Scan Error",
          description: "Failed to process code",
          variant: "destructive",
        });
        setIsProcessingScan(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Main POS Interface - Two Column Layout */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Left Column - Product Selection */}
        <div className="flex-1 bg-gray-50 overflow-y-auto pb-20">
          <div className="p-4">
            {/* Search & Filter Bar */}
            <div className="mb-4 space-y-2">
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={barcodeInputRef}
                    placeholder={
                      barcodeMode
                        ? "Scan barcode or QR code"
                        : "Search products by name, SKU, etc."
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleBarcodeScan}
                    className={`pl-10 text-sm ${barcodeMode ? "pr-24" : ""}`}
                  />
                  {barcodeMode && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Badge variant="default" className="bg-green-600 text-white text-xs px-2 py-0.5">
                        <ScanLine className="h-3 w-3 mr-1" />
                        Scan Mode
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={barcodeMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setBarcodeMode(!barcodeMode);
                      // Focus input when enabling barcode mode
                      if (!barcodeMode) {
                        setTimeout(() => {
                          barcodeInputRef.current?.focus();
                        }, 100);
                      }
                    }}
                    className={`text-xs h-9 ${barcodeMode ? "bg-green-600 hover:bg-green-700" : ""}`}
                  >
                    <ScanLine className="h-3.5 w-3.5 mr-1.5" />
                    {barcodeMode ? "Scan ON" : "Barcode"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className="text-xs h-9"
                  >
                    <Filter className="h-3.5 w-3.5 mr-1.5" />
                    Filters
                    {isFilterOpen ? (
                      <ChevronUp className="h-3.5 w-3.5 ml-1" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 ml-1" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Expanded Filters */}
              {isFilterOpen && (
                <div className="bg-white p-4 rounded-md border shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Price Range Filter */}
                    <div>
                      <h3 className="text-sm font-medium mb-2">Price Range</h3>
                      <div className="px-2">
                        <Slider
                          defaultValue={priceRange}
                          min={0}
                          max={300}
                          step={5}
                          onValueChange={setPriceRange}
                        />
                        <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                          <span>${priceRange[0]}</span>
                          <span>${priceRange[1]}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tags Filter */}
                    <div>
                      <h3 className="text-sm font-medium mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {productTags.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant={
                              selectedTags.includes(tag.id)
                                ? "default"
                                : "outline"
                            }
                            className={`cursor-pointer ${
                              selectedTags.includes(tag.id)
                                ? ""
                                : "hover:bg-gray-100"
                            }`}
                            onClick={() => {
                              if (selectedTags.includes(tag.id)) {
                                setSelectedTags(
                                  selectedTags.filter((t) => t !== tag.id)
                                );
                              } else {
                                setSelectedTags([...selectedTags, tag.id]);
                              }
                            }}
                          >
                            <Tag className="h-3 w-3 mr-1" />
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Clear Filters */}
                    <div className="flex items-end">
                      <Button
                        variant="ghost"
                        className="text-blue-600"
                        onClick={() => {
                          setSelectedTags([]);
                          setPriceRange([0, 300]);
                          setSearchQuery("");
                        }}
                      >
                        Clear All Filters
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Product Grid */}
            <ProductGrid
              searchQuery={isProcessingScan ? "" : searchQuery}
              selectedCategory={selectedCategory}
              priceRange={priceRange}
            />
          </div>
        </div>

        {/* Right Column - Cart & Checkout */}
        <CartAndCheckout />
      </div>

      {/* Customer Search Modal */}
      <CustomerSearchModal />

      {/* New Customer Form Modal */}
      <CustomerAddModal />

      {/* Discount Modal */}
      <DiscountModal />

      {/* Held Carts / Drafts Modal */}
      <HeldCartsModal />

      {/* Receipt Modal */}
      <ReceiptModal
        open={showReceiptModal}
        onOpenChange={handleCloseReceiptModal}
        data={receiptData}
        onNewSale={handleNewSale}
        formatCurrency={formatCurrency}
      />

      {/* Upsell Modal */}
      <Dialog open={showUpsellModal} onOpenChange={setShowUpsellModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Complete Your Look</DialogTitle>
            <DialogDescription>
              Consider adding these accessories to your purchase.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            {upsellProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <div className="relative h-32 bg-gray-100">
                  <img
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-medium text-sm mb-1 truncate">
                    {product.name}
                  </h3>
                  <p className="text-lg font-bold mb-2">
                    {formatCurrency(Number(product.selling_price))}
                  </p>
                  <Button
                    className="w-full mt-2"
                    onClick={() => {
                      const variation = product.variations?.[0];
                      if (variation) {
                        handleAddToCart(
                          product,
                          variation.size,
                          variation.color
                        );
                      }
                      setShowUpsellModal(false);
                    }}
                  >
                    Add to Cart
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
