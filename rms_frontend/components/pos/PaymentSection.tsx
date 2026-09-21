import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { usePOSStore } from "@/store/pos-store";
import {
  CreditCard,
  DollarSign,
  Smartphone,
  Gift,
  Zap,
  ChevronUp,
  ChevronDown,
  X,
  Plus,
  Calculator,
  Receipt,
  Clock,
} from "lucide-react";
import { PaymentMethod } from "@/types/sales";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

interface PaymentData {
  method: PaymentMethod;
  amount: string;
  notes?: string;
  transaction_id?: string;
}

interface PaymentSectionProps {
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  showSplitPayment: boolean;
  setShowSplitPayment: (show: boolean) => void;
  splitPayments: PaymentData[];
  handleSplitPaymentChange: (
    index: number,
    field: string,
    value: string
  ) => void;
  removeSplitPaymentMethod: (index: number) => void;
  addSplitPaymentMethod: () => void;
  cashAmount: string;
  setCashAmount: (amount: string) => void;
  total: number;
  changeDue: number;
  cart: any[];

  formatCurrency: (amount: number) => string;
  allowPartialPayment?: boolean;
  setAllowPartialPayment?: (allow: boolean) => void;
}

export default function PaymentSection({
  paymentMethod,
  setPaymentMethod,
  showSplitPayment,
  setShowSplitPayment,
  splitPayments,
  handleSplitPaymentChange,
  removeSplitPaymentMethod,
  addSplitPaymentMethod,
  cashAmount,
  setCashAmount,
  total,
  changeDue,
  cart,
  formatCurrency,
  allowPartialPayment = false,
  setAllowPartialPayment,
}: PaymentSectionProps) {
  const { toast } = useToast();
  const { handleCompletePayment, isProcessingSale } = usePOSStore();
  const [paymentSummary, setPaymentSummary] = useState({
    totalPaid: 0,
    remaining: 0,
    isFullPayment: true,
  });

  const [giftCardWarning, setGiftCardWarning] = useState(false);

  // Calculate payment summary whenever split payments change
  useEffect(() => {
    if (showSplitPayment && splitPayments.length > 0) {
      const totalPaid = splitPayments.reduce((sum, payment) => {
        const amount = parseFloat(payment.amount) || 0;
        return sum + amount;
      }, 0);
      
      const remaining = Math.max(0, total - totalPaid);
      const isFullPayment = totalPaid >= total;
      
      setPaymentSummary({
        totalPaid,
        remaining,
        isFullPayment,
      });

      // Check for gift card payments
      const hasGiftPayment = splitPayments.some(p => p.method === 'gift' && parseFloat(p.amount) > 0);
      setGiftCardWarning(hasGiftPayment);
    } else {
      // Single payment method
      const currentAmount = paymentMethod === 'cash' ? parseFloat(cashAmount) || 0 : total;
      setPaymentSummary({
        totalPaid: currentAmount,
        remaining: Math.max(0, total - currentAmount),
        isFullPayment: currentAmount >= total,
      });

      setGiftCardWarning(paymentMethod === 'gift');
    }
  }, [splitPayments, showSplitPayment, cashAmount, paymentMethod, total]);
  const handlePaymentMethodChange = (value: PaymentMethod) => {
    if (value === "split") {
      setShowSplitPayment(true);
      // Initialize with cash payment if split payments is empty
      if (splitPayments.length === 0) {
        addSplitPaymentMethod();
      }
    } else {
      setShowSplitPayment(false);
    }
    setPaymentMethod(value);
  };

  const calculateQuickAmount = (percentage: number) => {
    const amount = (total * percentage / 100).toFixed(2);
    setCashAmount(amount);
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'cash':
        return <DollarSign className="h-3 w-3" />;
      case 'card':
        return <CreditCard className="h-3 w-3" />;
      case 'mobile':
        return <Smartphone className="h-3 w-3" />;
      case 'gift':
        return <Gift className="h-3 w-3" />;
      default:
        return <Zap className="h-3 w-3" />;
    }
  };

  const canCompletePayment = () => {
    if (cart.length === 0) return false;
    
    if (allowPartialPayment) {
      return paymentSummary.totalPaid > 0;
    }
    
    return paymentSummary.isFullPayment;
  };

  const getPaymentButtonText = () => {
    if (cart.length === 0) return "No items in cart";
    
    if (showSplitPayment || allowPartialPayment) {
      if (paymentSummary.isFullPayment) {
        return "Complete Payment";
      } else if (paymentSummary.totalPaid > 0) {
        return `Pay ${formatCurrency(paymentSummary.totalPaid)} (${formatCurrency(paymentSummary.remaining)} due)`;
      } else {
        return "Enter payment amount";
      }
    }
    
    return "Complete Payment";
  };

  return (
    <div className="space-y-4">
      {/* Payment Method Selection */}
      <div className="grid grid-cols-3 gap-1.5">
        <Button
          variant={paymentMethod === "cash" ? "default" : "outline"}
          onClick={() => handlePaymentMethodChange("cash")}
          className="h-8 text-xs"
        >
          <DollarSign className="mr-1 h-3 w-3" />
          Cash
        </Button>
        <Button
          variant={paymentMethod === "card" ? "default" : "outline"}
          onClick={() => handlePaymentMethodChange("card")}
          className="h-8 text-xs"
        >
          <CreditCard className="mr-1 h-3 w-3" />
          Card
        </Button>
        <Button
          variant={paymentMethod === "mobile" ? "default" : "outline"}
          onClick={() => handlePaymentMethodChange("mobile")}
          className="h-8 text-xs"
        >
          <Smartphone className="mr-1 h-3 w-3" />
          Mobile
        </Button>
        <Button
          variant={paymentMethod === "gift" ? "default" : "outline"}
          onClick={() => handlePaymentMethodChange("gift")}
          className="h-8 text-xs"
        >
          <Gift className="mr-1 h-3 w-3" />
          Gift
        </Button>
        <Button
          variant={paymentMethod === "split" ? "default" : "outline"}
          onClick={() => handlePaymentMethodChange("split")}
          className="h-8 text-xs col-span-2"
        >
          <Zap className="mr-1 h-3 w-3" />
          Split Payment
        </Button>
      </div>

      {/* Gift Card Warning */}
      {giftCardWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center text-amber-800 text-xs">
            <Gift className="h-4 w-4 mr-2" />
            <span>Gift card payments will be recorded as expenses, not revenue.</span>
          </div>
        </div>
      )}

      {/* Split Payment Section */}
      {showSplitPayment && (
        <div className="space-y-3 border rounded-lg p-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Split Payment Methods</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={addSplitPaymentMethod}
              className="h-6 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Payment
            </Button>
          </div>
          
          {splitPayments.map((payment, index) => (
            <div key={index} className="flex items-center gap-2 bg-white p-2 rounded border">
              <div className="flex items-center gap-1">
                {getPaymentMethodIcon(payment.method)}
                <Select
                  value={payment.method}
                  onValueChange={(value: PaymentMethod) =>
                    handleSplitPaymentChange(index, "method", value)
                  }
                >
                  <SelectTrigger className="w-[100px] h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                    <SelectItem value="gift">Gift Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Input
                type="number"
                value={payment.amount}
                onChange={(e) =>
                  handleSplitPaymentChange(index, "amount", e.target.value)
                }
                placeholder="0.00"
                className="flex-1 h-7 text-xs"
                step="0.01"
                min="0"
              />
              
              {splitPayments.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSplitPaymentMethod(index)}
                  className="h-7 w-7"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}

          {/* Payment Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded p-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span>Total Amount:</span>
              <span className="font-medium">{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Amount Paid:</span>
              <span className={`font-medium ${paymentSummary.isFullPayment ? 'text-green-600' : 'text-orange-600'}`}>
                {formatCurrency(paymentSummary.totalPaid)}
              </span>
            </div>
            {!paymentSummary.isFullPayment && (
              <div className="flex justify-between text-xs">
                <span>Remaining:</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(paymentSummary.remaining)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Single Payment Method Sections */}
      {paymentMethod === "cash" && !showSplitPayment && (
        <div className="space-y-2">
          <Label className="text-xs">Cash Amount</Label>
          <Input
            type="number"
            value={cashAmount}
            onChange={(e) => setCashAmount(e.target.value)}
            placeholder="Enter cash amount"
            className="h-8 text-xs"
            step="0.01"
            min="0"
          />
          
          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-4 gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCashAmount(total.toString())}
              className="h-6 text-xs"
            >
              Exact
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => calculateQuickAmount(50)}
              className="h-6 text-xs"
            >
              50%
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => calculateQuickAmount(75)}
              className="h-6 text-xs"
            >
              75%
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCashAmount((Math.ceil(total / 10) * 10).toString())}
              className="h-6 text-xs"
            >
              Round
            </Button>
          </div>

          {changeDue > 0 && (
            <div className="text-xs bg-green-50 border border-green-200 rounded p-2">
              <div className="flex justify-between items-center">
                <span>Change Due:</span>
                <span className="font-bold text-green-700">
                  {formatCurrency(changeDue)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Partial Payment Option */}
      {setAllowPartialPayment && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="partial-payment"
            checked={allowPartialPayment}
            onCheckedChange={setAllowPartialPayment}
          />
          <Label htmlFor="partial-payment" className="text-xs">
            Allow partial payment (remaining amount will be due later)
          </Label>
        </div>
      )}

      {/* Payment Status Indicator */}
      {!paymentSummary.isFullPayment && paymentSummary.totalPaid > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded p-2">
          <div className="text-xs text-orange-800">
            <div className="flex items-center">
              <Calculator className="h-3 w-3 mr-1" />
              Partial Payment: {formatCurrency(paymentSummary.remaining)} will be marked as due
            </div>
          </div>
        </div>
      )}

      {/* Payment Action Buttons */}
      <div className="space-y-2">
        <Button
          onClick={() => handleCompletePayment(toast)}
          className="w-full h-10 text-sm font-medium"
          disabled={!canCompletePayment() || isProcessingSale}
          variant={paymentSummary.isFullPayment ? "default" : "secondary"}
        >
          <Receipt className="mr-2 h-4 w-4" />
          {isProcessingSale ? "Processing..." : getPaymentButtonText()}
        </Button>
        
        {/* Full Due Button */}
        <Button
          onClick={() => handleCompletePayment(toast, true)}
          className="w-full h-8 text-sm"
          variant="outline"
          disabled={cart.length === 0 || isProcessingSale}
        >
          <Clock className="mr-2 h-3 w-3" />
          {isProcessingSale ? "Processing..." : "Mark as Due (No Payment)"}
        </Button>
      </div>

      {/* Cart Summary */}
      {cart.length > 0 && (
        <div className="border-t pt-3 mt-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-gray-700">Order Summary</h4>
            <span className="text-xs text-gray-500">{cart.length} item{cart.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {cart.map((item: any) => (
              <div key={item.id} className="flex justify-between items-center text-xs">
                <div className="flex-1 min-w-0">
                  <span className="truncate">{item.name}</span>
                  <span className="text-gray-500 ml-1">×{item.quantity}</span>
                </div>
                <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t mt-2 pt-2 flex justify-between items-center">
            <span className="text-xs font-semibold">Total:</span>
            <span className="text-sm font-bold">{formatCurrency(total)}</span>
          </div>
        </div>
      )}

      {/* Payment Method Info */}
      {paymentMethod === "gift" && !showSplitPayment && (
        <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
          <div className="flex items-center">
            <Gift className="h-3 w-3 mr-1" />
            Gift card payments are recorded as expenses and do not count toward revenue.
          </div>
        </div>
      )}
    </div>
  );
}
