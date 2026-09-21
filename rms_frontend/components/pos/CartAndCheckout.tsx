"use client";
import {
  ShoppingCart,
  Percent,
  Trash2,
  X,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  Clock,
  PauseCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePOSStore } from "@/store/pos-store";
import PaymentSection from "./PaymentSection";
import type { PaymentMethod } from "@/types/sales";
import { Card } from "../ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export default function CartAndCheckout() {
  const { toast } = useToast();
  const {
    cart,
    cartDiscount,
    selectedCustomer,
    handleUpdateQuantity,
    handleRemoveItem,
    handleClearCart,
    handleItemDiscount,
    handleRemoveItemDiscount,
    setShowNewCustomerForm,
    setShowCustomerSearch,
    setShowDiscountModal,
    handleCompletePayment,
    setCurrentSaleData,
    paymentMethod,
    setPaymentMethod,
    showSplitPayment,
    setShowSplitPayment,
    splitPayments,
    setSplitPayments,
    cashAmount,
    setCashAmount,
    heldCarts,
    holdCurrentCart,
    setShowHeldCartsModal,
  } = usePOSStore();

  const [isMounted, setIsMounted] = useState(true);
  const cartRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMounted &&
        cartRef.current &&
        !cartRef.current.contains(event.target as Node) &&
        toggleButtonRef.current &&
        !toggleButtonRef.current.contains(event.target as Node)
      ) {
        setIsMounted(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMounted]);

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => {
    const itemTotal = item.price * item.quantity;
    if (item.discount) {
      return item.discount.type === "percentage"
        ? sum + itemTotal * (1 - item.discount.value / 100)
        : sum + itemTotal - item.discount.value;
    }
    return sum + itemTotal;
  }, 0);

  let discountedSubtotal = subtotal;

  // Apply cart-wide discount if any
  if (cartDiscount) {
    if (cartDiscount.type === "percentage") {
      discountedSubtotal = subtotal * (1 - cartDiscount.value / 100);
    } else {
      discountedSubtotal = subtotal - cartDiscount.value;
    }
  }

  const changeDue = cashAmount
    ? Number.parseFloat(cashAmount) - discountedSubtotal
    : 0;

  const handleSplitPaymentChange = (
    index: number,
    field: string,
    value: string
  ) => {
    const updatedPayments = [...splitPayments];
    if (field === "method") {
      updatedPayments[index] = {
        ...updatedPayments[index],
        method: value as PaymentMethod,
      };
    } else {
      updatedPayments[index] = { ...updatedPayments[index], amount: value };
    }
    setSplitPayments(updatedPayments);
  };

  const removeSplitPaymentMethod = (index: number) => {
    if (splitPayments.length > 2) {
      const updatedPayments = splitPayments.filter((_, i) => i !== index);
      setSplitPayments(updatedPayments);
    }
  };

  const addSplitPaymentMethod = () => {
    setSplitPayments([
      ...splitPayments,
      { method: "cash" as PaymentMethod, amount: "" },
    ]);
  };

  const closeDialog = (dialogElement: HTMLElement) => {
    const closeButton = dialogElement.querySelector(
      'button[data-state="closed"]'
    ) as HTMLButtonElement;
    if (closeButton) {
      closeButton.click();
    }
  };

  const handleCompleteSale = async () => {
    if (!selectedCustomer) {
      toast({
        title: "Customer Required",
        description: "Please select a customer first",
        variant: "destructive",
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Your cart is empty",
        variant: "destructive",
      });
      return;
    }

    try {
      // Call the complete payment function with toast
      await handleCompletePayment(toast);
      handleClearCart();
    } catch (error) {
      console.error("Error completing sale:", error);
      toast({
        title: "Error",
        description: "Failed to complete sale. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <AnimatePresence>
        {isMounted ? (
          <motion.div
            ref={cartRef}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            className="fixed bottom-0 right-0 sm:right-4 lg:right-[100px] z-50 w-full sm:w-auto"
          >
            <Card className="w-full sm:w-[600px] lg:w-[1000px] bg-white border-t sm:border shadow-2xl flex flex-col p-3 sm:p-4 h-[88vh] sm:h-[75vh] lg:h-[70vh] mb-0 sm:mb-4 lg:mb-8 rounded-t-2xl sm:rounded-xl rounded-b-none sm:rounded-b-xl overflow-hidden">
              {/* Cart Header */}
              <div className="p-2 border-b flex justify-between items-center">
                                 <h2 className="text-sm font-semibold flex items-center">
                   <ShoppingCart className="h-4 w-4 mr-1" />
                   Cart
                   {cart.length > 0 && (
                     <Badge className="ml-1 text-xs bg-blue-500 hover:bg-blue-600">{cart.length}</Badge>
                   )}
                 </h2>
                <div className="flex items-center gap-1">
                  {heldCarts.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowHeldCartsModal(true)}
                      className="h-7 text-xs px-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-medium"
                      title="View and resume parked sales"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      Held ({heldCarts.length})
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const held = holdCurrentCart();
                      if (held) {
                        toast({
                          title: "Cart Held",
                          description: "Sale parked. Ready for next customer.",
                        });
                      }
                    }}
                    disabled={cart.length === 0}
                    className="h-7 text-xs px-2 text-amber-600 border-amber-200 hover:bg-amber-50 font-medium"
                    title="Park active sale to serve next customer"
                  >
                    <PauseCircle className="h-3 w-3 mr-1" />
                    Hold
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDiscountModal(true)}
                    disabled={cart.length === 0}
                    className="h-7 text-xs px-2"
                  >
                    <Percent className="h-3 w-3 mr-1" />
                    Discount
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 h-7 text-xs px-2"
                    onClick={handleClearCart}
                    disabled={cart.length === 0}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => setIsMounted(false)}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Cart Items */}
              <ScrollArea className="flex-1">
                {cart.length > 0 ? (
                  <div className="p-2 space-y-2">
                    {cart.map((item) => (
                      <div key={item.id} className="border rounded-md p-1.5">
                                                 <div className="flex items-center">
                           <div className="h-10 w-10 bg-gray-100 rounded mr-2 flex-shrink-0 overflow-hidden">
                             <img
                               src={item.image || "/api/placeholder/40/40"}
                               alt={item.name}
                               className="h-full w-full object-cover rounded"
                               onError={(e) => {
                                 const target = e.target as HTMLImageElement;
                                 target.src = "/api/placeholder/40/40";
                               }}
                             />
                           </div>
                                                     <div className="flex-1 min-w-0">
                             <p className="font-medium text-xs truncate">
                               {item.name}
                             </p>
                             <div className="flex items-center text-[10px] text-muted-foreground flex-wrap">
                               <span>Size: {item.size || 'Standard'}</span>
                               <span className="mx-1">•</span>
                               <span>Color: {item.color || 'Default'}</span>
                               <span className="mx-1">•</span>
                               <span className="font-medium">{formatCurrency(item.price)}</span>
                             </div>
                             {(item as any).sku && (
                               <div className="text-[9px] text-gray-400 mt-0.5">
                                 SKU: {(item as any).sku}
                               </div>
                             )}
                           </div>
                          <div className="flex items-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleUpdateQuantity(item.id, -1)}
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-4 text-center text-xs">
                              {item.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleUpdateQuantity(item.id, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-600"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Item discount section */}
                        <div className="mt-1 flex items-center justify-between">
                          <div className="flex-1">
                            {item.discount ? (
                              <div className="flex items-center">
                                <Badge
                                  variant="outline"
                                  className="bg-red-50 text-red-600 mr-1 text-[10px]"
                                >
                                  {item.discount.type === "percentage"
                                    ? `${item.discount.value}% OFF`
                                    : `$${item.discount.value} OFF`}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 text-[10px] text-red-600 p-0"
                                  onClick={() =>
                                    handleRemoveItemDiscount(item.id)
                                  }
                                >
                                  Remove
                                </Button>
                              </div>
                            ) : (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 text-[10px] p-0"
                                  >
                                    <Percent className="h-2 w-2 mr-1" />
                                    Add Discount
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                  <DialogHeader>
                                    <DialogTitle className="text-sm">
                                      Apply Item Discount
                                    </DialogTitle>
                                    <DialogDescription className="text-xs">
                                      Apply a discount to this specific item.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="grid gap-2 py-2">
                                    <Tabs defaultValue="percentage">
                                      <TabsList className="grid w-full grid-cols-2 h-8">
                                        <TabsTrigger
                                          value="percentage"
                                          className="text-xs"
                                        >
                                          Percentage (%)
                                        </TabsTrigger>
                                        <TabsTrigger
                                          value="fixed"
                                          className="text-xs"
                                        >
                                          Fixed Amount ($)
                                        </TabsTrigger>
                                      </TabsList>
                                      <TabsContent
                                        value="percentage"
                                        className="space-y-2 mt-2"
                                      >
                                        <div className="space-y-1">
                                          <Label
                                            htmlFor="percentage"
                                            className="text-xs"
                                          >
                                            Discount Percentage
                                          </Label>
                                          <div className="flex items-center">
                                            <Input
                                              id="percentage"
                                              type="number"
                                              min="0"
                                              max="100"
                                              defaultValue="10"
                                              className="h-7 text-xs"
                                            />
                                            <span className="ml-1 text-xs">
                                              %
                                            </span>
                                          </div>
                                        </div>
                                        <Button
                                          className="w-full h-7 text-xs"
                                          onClick={(e) => {
                                            const input =
                                              document.getElementById(
                                                "percentage"
                                              ) as HTMLInputElement;
                                            handleItemDiscount(
                                              item.id,
                                              "percentage",
                                              Number(input.value)
                                            );
                                            const dialogElement = (
                                              e.target as HTMLElement
                                            ).closest("dialog");
                                            if (dialogElement) {
                                              closeDialog(dialogElement);
                                            }
                                          }}
                                        >
                                          Apply Percentage Discount
                                        </Button>
                                      </TabsContent>
                                      <TabsContent
                                        value="fixed"
                                        className="space-y-2 mt-2"
                                      >
                                        <div className="space-y-1">
                                          <Label
                                            htmlFor="fixed"
                                            className="text-xs"
                                          >
                                            Discount Amount
                                          </Label>
                                          <div className="flex items-center">
                                            <span className="mr-1 text-xs">
                                              $
                                            </span>
                                            <Input
                                              id="fixed"
                                              type="number"
                                              min="0"
                                              max={item.price * item.quantity}
                                              defaultValue="5"
                                              className="h-7 text-xs"
                                            />
                                          </div>
                                        </div>
                                        <Button
                                          className="w-full h-7 text-xs"
                                          onClick={(e) => {
                                            const input =
                                              document.getElementById(
                                                "fixed"
                                              ) as HTMLInputElement;
                                            handleItemDiscount(
                                              item.id,
                                              "fixed",
                                              Number(input.value)
                                            );
                                            const dialogElement = (
                                              e.target as HTMLElement
                                            ).closest("dialog");
                                            if (dialogElement) {
                                              closeDialog(dialogElement);
                                            }
                                          }}
                                        >
                                          Apply Fixed Discount
                                        </Button>
                                      </TabsContent>
                                    </Tabs>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                          <div className="text-xs font-medium">
                            {formatCurrency(
                              item.discount
                                ? item.discount.type === "percentage"
                                  ? item.price *
                                    item.quantity *
                                    (1 - item.discount.value / 100)
                                  : item.price * item.quantity -
                                    item.discount.value
                                : item.price * item.quantity
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                                 ) : (
                   <div className="h-full flex flex-col items-center justify-center p-4 text-center">
                     <div className="bg-gray-100 rounded-full p-4 mb-3">
                       <ShoppingCart className="h-8 w-8 text-gray-400" />
                     </div>
                     <h3 className="text-sm font-medium text-gray-700 mb-1">Your cart is empty</h3>
                     <p className="text-xs text-muted-foreground">
                       Browse products and add items to start a new order
                     </p>
                   </div>
                 )}
              </ScrollArea>

              {/* Cart Footer - Subtotal, Tax, Total, and Checkout */}
              <div className="border-t">
                <div className="grid md:grid-cols-2 gap-2">
                  {/* Customer Section */}
                  <div className="p-2 border-r">
                    <div className="flex items-center justify-between mb-1">
                      <Label htmlFor="customer" className="text-xs">
                        Customer
                      </Label>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setShowCustomerSearch(true)}
                        className="h-6 text-xs"
                      >
                        {selectedCustomer ? "Change" : "Select Customer"}
                      </Button>
                    </div>
                    {selectedCustomer ? (
                      <div className="flex items-center">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs truncate">
                            {selectedCustomer.first_name}{" "}
                            {selectedCustomer.last_name}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {selectedCustomer.email || selectedCustomer.phone}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowNewCustomerForm(true)}
                        className="h-6 text-xs"
                      >
                        Add New Customer
                      </Button>
                    )}

                    {/* Cart Summary */}
                    <div className="mt-2 bg-gray-50 p-2 rounded-md">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Subtotal</span>
                          <span>{formatCurrency(subtotal)}</span>
                        </div>
                        {cartDiscount && (
                          <div className="flex justify-between text-xs text-red-600">
                            <span>
                              {cartDiscount.type === "percentage"
                                ? `Discount (${cartDiscount.value}%)`
                                : "Discount"}
                            </span>
                            <span>
                              -{formatCurrency(subtotal - discountedSubtotal)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold pt-1 border-t text-xs">
                          <span>Total</span>
                          <span>{formatCurrency(discountedSubtotal)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Section */}
                  <div className="p-2">
                                         <PaymentSection
                       paymentMethod={paymentMethod}
                       setPaymentMethod={setPaymentMethod}
                       showSplitPayment={showSplitPayment}
                       setShowSplitPayment={setShowSplitPayment}
                       splitPayments={splitPayments}
                       handleSplitPaymentChange={handleSplitPaymentChange}
                       removeSplitPaymentMethod={removeSplitPaymentMethod}
                       addSplitPaymentMethod={addSplitPaymentMethod}
                       cashAmount={cashAmount}
                       setCashAmount={setCashAmount}
                       total={discountedSubtotal}
                       changeDue={changeDue}
                       cart={cart}
                       handleCompletePayment={handleCompleteSale}
                       formatCurrency={formatCurrency}
                       allowPartialPayment={false}
                       setAllowPartialPayment={undefined}
                     />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            className="fixed bottom-4 right-4 sm:right-6 lg:right-[100px] z-50"
          >
            <Button
              ref={toggleButtonRef}
              variant="outline"
              size="sm"
              className="bg-white shadow-lg border-2 border-indigo-200 text-indigo-900 font-semibold"
              onClick={() => setIsMounted(true)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Show Cart
              {cart.length > 0 && (
                <Badge className="ml-1 text-xs bg-blue-500 hover:bg-blue-600">{cart.length}</Badge>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
