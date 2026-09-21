'use client';

import React from 'react';
import { usePOSStore } from '@/store/pos-store';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, Play, Trash2, User, ShoppingCart } from 'lucide-react';

export function HeldCartsModal() {
    const {
        heldCarts,
        showHeldCartsModal,
        setShowHeldCartsModal,
        resumeHeldCart,
        deleteHeldCart,
        clearAllHeldCarts,
    } = usePOSStore();

    return (
        <Dialog open={showHeldCartsModal} onOpenChange={setShowHeldCartsModal}>
            <DialogContent className="sm:max-w-[580px] p-6">
                <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b">
                    <div>
                        <DialogTitle className="text-lg font-bold flex items-center gap-2">
                            <Clock className="w-5 h-5 text-amber-500" />
                            Held Transactions ({heldCarts.length})
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                            Resume a parked sale or clear abandoned carts.
                        </DialogDescription>
                    </div>
                    {heldCarts.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAllHeldCarts}
                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 text-xs h-8"
                        >
                            Clear All
                        </Button>
                    )}
                </DialogHeader>

                {heldCarts.length === 0 ? (
                    <div className="py-12 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                            <ShoppingCart className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-semibold text-sm text-foreground">No Held Transactions</p>
                            <p className="text-xs text-muted-foreground max-w-[280px] mx-auto">
                                Click &quot;Hold Sale&quot; in the POS register whenever a customer steps away or prepares payment.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 mt-3">
                        {heldCarts.map((held) => {
                            const dateFormatted = new Date(held.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                            });
                            const totalItems = held.cart.reduce((sum, item) => sum + item.quantity, 0);

                            return (
                                <div
                                    key={held.id}
                                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                                >
                                    <div className="space-y-1.5 min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-foreground">
                                                ৳{held.total.toLocaleString()}
                                            </span>
                                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                                                {totalItems} {totalItems === 1 ? 'item' : 'items'}
                                            </span>
                                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {dateFormatted}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                                            <User className="w-3.5 h-3.5 shrink-0" />
                                            <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                                                {held.customer
                                                    ? `${held.customer.first_name || ''} ${held.customer.last_name || ''}`.trim() || held.customer.phone
                                                    : 'Walk-in Customer'}
                                            </span>
                                            {held.note && (
                                                <span className="truncate italic text-slate-400">
                                                    • &quot;{held.note}&quot;
                                                </span>
                                            )}
                                        </div>

                                        <div className="text-[11px] text-slate-500 truncate">
                                            {held.cart.map((i) => `${i.name} (${i.size}/${i.color}) x${i.quantity}`).join(', ')}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <Button
                                            size="sm"
                                            onClick={() => resumeHeldCart(held.id)}
                                            className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-1.5"
                                        >
                                            <Play className="w-3.5 h-3.5 fill-current" />
                                            Resume
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => deleteHeldCart(held.id)}
                                            className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                                            title="Discard held sale"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default HeldCartsModal;
