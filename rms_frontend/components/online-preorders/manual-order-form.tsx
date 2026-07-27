"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Search, Plus, Minus, ShoppingCart, Trash2, ArrowRight, ArrowLeft, Package, User, MapPin, CheckCircle2 } from "lucide-react";
import { useSearchCustomers } from "@/hooks/queries/use-customer";
import { useProducts } from "@/hooks/queries/useInventory";
import { onlinePreordersApi, OnlinePreorder } from "@/lib/api/onlinePreorder";
import { ecommerceApi } from "@/lib/api/ecommerce";
import { useDiscounts } from "@/hooks/queries/useEcommerce";
import POSStyleProductGrid from "./pos-style-product-grid";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useBdAddress, Division, District, Upazilla, Union } from "@/hooks/useBdAddress";
import { useDebounce } from "@/hooks/use-debounce";

// Import local JSON since we copied it
import dhakaThanasData from "./dhaka_thanas_structure.json";

interface Place {
    name: string
    bn_name: string
}

interface Thana {
    name: string
    bn_name: string
    places: Place[]
}

interface CityCorporation {
    name: string
    name_bn?: string
    abbreviation: string
    thanas: Thana[]
}

interface ManualOrderFormProps {
    onSuccess: () => void;
    onCancel: () => void;
    initialData?: OnlinePreorder;
}

export function ManualOrderForm({ onSuccess, onCancel, initialData }: ManualOrderFormProps) {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Customer Search State
    const [customerSearch, setCustomerSearch] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    // For online preorders, only show customers whose type is 'online' or 'both'
    const { data: customerResults } = useSearchCustomers(customerSearch, 1, 20, { customer_type: 'online' });

    // Form States (matching CheckoutForm)
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");

    // Address State
    const [deliveryMethod, setDeliveryMethod] = useState<'inside' | 'outside' | 'gazipur'>('inside');
    const [address, setAddress] = useState("");
    const [notes, setNotes] = useState("");
    const [deliveryCharge, setDeliveryCharge] = useState(0);

    // BD Address Hook
    const {
        divisions,
        districts,
        upazillas,
        unions,
        loading: bdLoading,
        loadingDistricts,
        loadingUpazillas,
        loadingUnions,
        error: bdError,
        unionError,
        selectedDivision,
        selectedDivisionId,
        selectedDistrict,
        selectedDistrictId,
        selectedUpazilla,
        selectedUpazillaId,
        setSelectedDivision,
        setSelectedDistrict,
        setSelectedUpazilla,
    } = useBdAddress();

    const [selectedUnion, setSelectedUnion] = useState<string>("");

    // Dhaka Address States
    const [selectedCityCorp, setSelectedCityCorp] = useState<string>("");
    const [selectedThana, setSelectedThana] = useState<string>("");
    const [selectedPlace, setSelectedPlace] = useState<string>("");

    const cityCorporations: CityCorporation[] = dhakaThanasData.city_corporations || [];
    const availableThanas = cityCorporations.find(cc => cc.name === selectedCityCorp)?.thanas || [];
    const availablePlaces: Place[] = availableThanas.find(t => t.name === selectedThana)?.places || [];

    // Products State
    const [productSearch, setProductSearch] = useState("");
    const { data: discountsData } = useDiscounts();
    const discounts = discountsData || [];
    const [items, setItems] = useState<any[]>([]);
    const [deliverySettings, setDeliverySettings] = useState<any>(null);

    // Fetch delivery settings
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settings = await ecommerceApi.getDeliverySettings();
                setDeliverySettings(settings);
            } catch (error) {
                console.error("Failed to fetch delivery settings:", error);
            }
        };
        fetchSettings();
    }, []);

    // Auto-update delivery charge
    useEffect(() => {
        if (!deliverySettings) return;

        let charge = 0;
        if (deliveryMethod === 'inside') {
            charge = Number(deliverySettings.inside_dhaka_charge || 0);
        } else if (deliveryMethod === 'gazipur') {
            charge = Number(deliverySettings.inside_gazipur_charge || 0);
        } else {
            charge = Number(deliverySettings.outside_dhaka_charge || 0);
        }
        setDeliveryCharge(charge);
    }, [deliveryMethod, deliverySettings]);

    // Initialize formatting for editing
    useEffect(() => {
        if (initialData) {
            // Split name
            const nameParts = initialData.customer_name.split(' ');
            setFirstName(nameParts[0] || "");
            setLastName(nameParts.slice(1).join(' ') || "");
            setPhone(initialData.customer_phone);
            setEmail(initialData.customer_email || "");

            // Set Address based on data (this might need parsing if stored as complex JSON)
            // Ideally we parse the shipping_address JSON structure
            const addr = initialData.shipping_address;
            if (addr) {
                // Determine delivery method roughly
                if (addr.city_corporation) {
                    setDeliveryMethod('inside');
                    setSelectedCityCorp(addr.city_corporation);
                    setSelectedThana(addr.thana || "");
                    setSelectedPlace(addr.place || "");
                    setAddress(addr.address || "");
                } else if (addr.division) {
                    // This is tricky as we need IDs to set hook state, but let's try setting names
                    // The hook might need IDs. For now, let's just set the text address
                    setDeliveryMethod('outside');  // Default/Guess
                    // To properly restore state we'd need to lookup IDs from names which is complex without the full list map
                    setAddress(addr.address || "");
                }
            }

            setItems(initialData.items.map(item => ({
                product_id: item.product_id,
                name: item.product_name || `Product #${item.product_id}`,
                size: item.size,
                color: item.color,
                quantity: item.quantity,
                unit_price: Number(item.unit_price),
                discount: Number(item.discount || 0),
            })));
            setNotes(initialData.notes || "");
            setDeliveryCharge(Number(initialData.delivery_charge || 0));
        }
    }, [initialData]);

    // Auto-fill from selected customer
    useEffect(() => {
        if (selectedCustomer) {
            setFirstName(selectedCustomer.first_name);
            setLastName(selectedCustomer.last_name);
            setPhone(selectedCustomer.phone);
            setEmail(selectedCustomer.email || "");
            // Cannot easily auto-fill address as customer model address is a simple string usually
        }
    }, [selectedCustomer]);

    // Auto-select logic for Gazipur/Dhaka (from CheckoutForm)
    useEffect(() => {
        if (deliveryMethod === 'gazipur' && divisions.length > 0 && (!selectedDivisionId || (selectedDivisionId !== 6 && selectedDivisionId !== "6"))) {
            const dhakaDivision = divisions.find(d => d.id === 6 || d.id === "6")
            if (dhakaDivision) {
                setSelectedDivision(dhakaDivision.name, dhakaDivision.id)
            }
        }
    }, [deliveryMethod, divisions, selectedDivisionId, setSelectedDivision])

    useEffect(() => {
        if (deliveryMethod === 'gazipur' && selectedDivisionId && (selectedDivisionId === 6 || selectedDivisionId === "6")) {
            if (districts.length > 0 && (!selectedDistrictId || (selectedDistrictId !== 41 && selectedDistrictId !== "41"))) {
                const gazipurDistrict = districts.find(d => d.id === 41 || d.id === "41")
                if (gazipurDistrict) {
                    setSelectedDistrict(gazipurDistrict.name, gazipurDistrict.id)
                }
            }
        }
    }, [deliveryMethod, selectedDivisionId, districts, selectedDistrictId, setSelectedDistrict])

    // Handlers
    const handleAddGridItem = (data: {
        product: any;
        size: string;
        color: string;
        colorHex?: string;
        finalPrice: number;
        discountAmount: number;
    }) => {
        // unit_price = original price, discount = total discount for the line
        const newItem = {
            product_id: data.product.id,
            name: data.product.name,
            image: data.product.image || data.product.first_variation_image,
            size: data.size,
            color: data.color,
            colorHex: data.colorHex,
            quantity: 1,
            unit_price: Number(data.product.selling_price || 0),
            discount: Number(data.discountAmount || 0),
            unit_discount: Number(data.discountAmount || 0) // Store unit discount for recalculations
        };
        setItems([...items, newItem]);
    };

    const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

    const updateItem = (idx: number, field: string, value: any) => {
        const newItems = [...items];
        const item = { ...newItems[idx] };

        if (field === 'quantity') {
            const qty = Number(value);
            item.quantity = qty;
            item.discount = (item.unit_discount || 0) * qty;
        } else if (field === 'discount') {
            // If manually updated unit discount
            const unitDisc = Number(value);
            item.unit_discount = unitDisc;
            item.discount = unitDisc * item.quantity;
        } else {
            item[field] = value;
        }

        newItems[idx] = item;
        setItems(newItems);
    };

    const calculateSubtotal = () => Math.round(items.reduce((sum, item) => sum + (Number(item.unit_price || 0) * item.quantity) - Number(item.discount || 0), 0));
    const calculateTotal = () => Math.round(calculateSubtotal() + Number(deliveryCharge || 0));

    const handleSubmit = async () => {
        // Prevent double submission
        if (isSubmitting) return;
        
        setIsSubmitting(true);
        try {
            // Build shipping address
            let shipping_address: any = {};
            if (deliveryMethod === 'inside') {
                shipping_address = {
                    city_corporation: selectedCityCorp,
                    thana: selectedThana,
                    place: selectedPlace,
                    address: address,
                };
            } else {
                shipping_address = {
                    division: selectedDivision,
                    district: selectedDistrict,
                    upazila: selectedUpazilla,
                    union: selectedUnion,
                    address: address,
                };
            }

            const payload = {
                customer_name: `${firstName} ${lastName}`.trim(),
                customer_phone: phone,
                customer_email: email,
                items: items.map(item => ({
                    product_id: item.product_id,
                    size: item.size,
                    color: item.color,
                    quantity: item.quantity,
                    unit_price: Math.round(Number(item.unit_price || 0)),
                    discount: Math.round(Number(item.discount || 0)),
                })),
                shipping_address,
                delivery_charge: deliveryCharge,
                delivery_method: deliveryMethod === 'inside' ? "Inside Dhaka" : deliveryMethod === 'gazipur' ? "Inside Gazipur" : "Outside Dhaka",
                total_amount: calculateTotal(),
                notes: notes,
                status: initialData ? initialData.status : "PENDING",
            };

            if (initialData?.id) {
                await onlinePreordersApi.update(initialData.id, payload);
                toast({ title: "Success", description: "Order updated successfully" });
            } else {
                await onlinePreordersApi.create(payload);
                toast({ title: "Success", description: "Manual order created successfully" });
            }
            onSuccess();
        } catch (error) {
            toast({ title: "Error", description: "Failed to save order", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Step rendering helpers
    const renderStepIcon = (s: number, icon: any) => {
        const Icon = icon;
        const isActive = step === s;
        const isCompleted = step > s;
        return (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${isActive ? 'bg-indigo-600 text-white shadow-md' :
                isCompleted ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'
                }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-white text-indigo-600' :
                    isCompleted ? 'bg-green-600 text-white' : 'bg-slate-300 text-white'
                    }`}>
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : s}
                </div>
                <span className="text-sm font-semibold hidden md:inline">{
                    s === 1 ? "Details" : s === 2 ? "Products" : "Review"
                }</span>
            </div>
        );
    };

    const nextDisabled = () => {
        if (step === 1) {
            if (!firstName || !phone || !address) return true;
            if (deliveryMethod === 'inside' && (!selectedCityCorp || !selectedThana)) return true;
            if (deliveryMethod !== 'inside' && (!selectedDivision || !selectedDistrict)) return true;
            return false;
        }
        if (step === 2) return items.length === 0;
        return false;
    };

    return (
        <div className="space-y-8">
            {/* Step Indicator */}
            <div className="flex items-center justify-center max-w-2xl mx-auto px-4 mb-8">
                {renderStepIcon(1, User)}
                <div className="w-12 h-px bg-slate-200 mx-2" />
                {renderStepIcon(2, Package)}
                <div className="w-12 h-px bg-slate-200 mx-2" />
                {renderStepIcon(3, CheckCircle2)}
            </div>

            <div className="max-w-5xl mx-auto">
                {step === 1 && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left: Customer Search & Selection */}
                        <div className="lg:col-span-1 space-y-6">
                            <Card className="border-none shadow-md">
                                <CardHeader>
                                    <CardTitle className="text-lg">Find Customer</CardTitle>
                                    <CardDescription>Search existing customers to auto-fill details</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input
                                            placeholder="Search name/phone..."
                                            className="pl-10 h-10"
                                            value={customerSearch}
                                            onChange={(e) => setCustomerSearch(e.target.value)}
                                        />
                                    </div>
                                    {customerResults?.results?.length > 0 ? (
                                        <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                                            {customerResults.results.slice(0, 5).map((c: any) => (
                                                <div
                                                    key={c.id}
                                                    className={`p-3 cursor-pointer hover:bg-slate-50 text-sm ${selectedCustomer?.id === c.id ? "bg-indigo-50 border-l-4 border-l-indigo-600" : ""}`}
                                                    onClick={() => setSelectedCustomer(c)}
                                                >
                                                    <div className="font-bold">{c.first_name} {c.last_name}</div>
                                                    <div className="text-xs text-slate-500">{c.phone}</div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : customerSearch ? (
                                        <div className="text-center py-4 text-sm text-slate-500">No customers found</div>
                                    ) : null}

                                    {selectedCustomer && (
                                        <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => {
                                            setSelectedCustomer(null);
                                            setFirstName(""); setLastName(""); setPhone(""); setEmail("");
                                        }}>
                                            Clear Selection
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right: Form Fields */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="border-none shadow-md">
                                <CardHeader>
                                    <CardTitle>Customer & Shipping Details</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Contact Info */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>First Name *</Label>
                                            <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Last Name *</Label>
                                            <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" />
                                        </div>
                                        <div className="space-y-2 col-span-2 md:col-span-1">
                                            <Label>Phone *</Label>
                                            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="017xxxxxxxx" />
                                        </div>
                                        <div className="space-y-2 col-span-2 md:col-span-1">
                                            <Label>Email</Label>
                                            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="Optional" />
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Delivery Method Toggle */}
                                    <div className="flex justify-start">
                                        <div className="inline-flex rounded-lg border p-1 bg-slate-50">
                                            {[
                                                { id: 'inside', label: 'Inside Dhaka' },
                                                { id: 'gazipur', label: 'Inside Gazipur' },
                                                { id: 'outside', label: 'Outside Dhaka' }
                                            ].map((m) => (
                                                <button
                                                    key={m.id}
                                                    onClick={() => {
                                                        setDeliveryMethod(m.id as any);
                                                        // Reset logic
                                                        if (m.id === 'inside') {
                                                            setSelectedCityCorp(""); setSelectedThana(""); setSelectedPlace("");
                                                        } else if (m.id === 'gazipur') {
                                                            setSelectedCityCorp(""); setSelectedThana(""); setSelectedPlace("");
                                                            setSelectedUnion("");
                                                        } else {
                                                            setSelectedDivision("", ""); setSelectedDistrict("", ""); setSelectedUpazilla("", ""); setSelectedUnion("");
                                                        }
                                                    }}
                                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${deliveryMethod === m.id ? 'bg-white shadow-sm text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-900'
                                                        }`}
                                                >
                                                    {m.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Address Fields */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {deliveryMethod === 'inside' ? (
                                            <>
                                                <div className="space-y-2">
                                                    <Label>City Corporation *</Label>
                                                    <Select value={selectedCityCorp} onValueChange={(v) => { setSelectedCityCorp(v); setSelectedThana(""); setSelectedPlace(""); }}>
                                                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                                        <SelectContent>
                                                            {cityCorporations.map(cc => <SelectItem key={cc.name} value={cc.name}>{cc.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Thana *</Label>
                                                    <Select value={selectedThana} onValueChange={(v) => { setSelectedThana(v); setSelectedPlace(""); }} disabled={!selectedCityCorp}>
                                                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                                        <SelectContent>
                                                            {availableThanas.map(t => <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2 col-span-2">
                                                    <Label>Place *</Label>
                                                    <Select value={selectedPlace} onValueChange={setSelectedPlace} disabled={!selectedThana}>
                                                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                                        <SelectContent>
                                                            {availablePlaces.map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="space-y-2">
                                                    <Label>Division *</Label>
                                                    <Select
                                                        value={selectedDivision}
                                                        onValueChange={(v) => {
                                                            const d = divisions.find(d => d.name === v);
                                                            if (d) setSelectedDivision(d.name, d.id);
                                                        }}
                                                        disabled={bdLoading || deliveryMethod === 'gazipur'}
                                                    >
                                                        <SelectTrigger><SelectValue placeholder={deliveryMethod === 'gazipur' ? "Dhaka (Auto)" : "Select..."} /></SelectTrigger>
                                                        <SelectContent>
                                                            {divisions.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>District *</Label>
                                                    <Select
                                                        value={selectedDistrict}
                                                        onValueChange={(v) => {
                                                            const d = districts.find(d => d.name === v);
                                                            if (d) setSelectedDistrict(d.name, d.id);
                                                        }}
                                                        disabled={!selectedDivision || loadingDistricts || deliveryMethod === 'gazipur'}
                                                    >
                                                        <SelectTrigger><SelectValue placeholder={deliveryMethod === 'gazipur' ? "Gazipur (Auto)" : "Select..."} /></SelectTrigger>
                                                        <SelectContent>
                                                            {districts.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Upazilla / Thana *</Label>
                                                    <Select
                                                        value={selectedUpazilla}
                                                        onValueChange={(v) => {
                                                            const u = upazillas.find(u => u.name === v);
                                                            if (u) setSelectedUpazilla(u.name, u.id);
                                                        }}
                                                        disabled={!selectedDistrict || loadingUpazillas}
                                                    >
                                                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                                        <SelectContent>
                                                            {upazillas.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Union *</Label>
                                                    <Select
                                                        value={selectedUnion}
                                                        onValueChange={setSelectedUnion}
                                                        disabled={!selectedUpazilla || loadingUnions}
                                                    >
                                                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                                        <SelectContent>
                                                            {unions.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </>
                                        )}
                                        <div className="space-y-2 col-span-2">
                                            <Label>Delivery Charge (৳)</Label>
                                            <Input type="number" value={deliveryCharge} onChange={e => setDeliveryCharge(Number(e.target.value))} />
                                        </div>
                                        <div className="space-y-2 col-span-2">
                                            <Label>Full Address *</Label>
                                            <Textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="House, Road, Area..." />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900">Add Products</h3>
                                <p className="text-slate-500">Pick items and variants for the order</p>
                            </div>
                            <div className="flex gap-4 items-center">
                                <div className="relative w-72">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <Input
                                        className="pl-9 bg-white border-slate-200"
                                        placeholder="Search by SKU or Name..."
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                    />
                                </div>
                                <div className="h-10 px-4 bg-slate-900 text-white rounded-lg flex items-center font-medium shadow-sm">
                                    {items.length} Items Selected
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            {/* Product selection grid */}
                            <div className="lg:col-span-3 h-[650px] overflow-y-auto pr-2 custom-scrollbar border rounded-xl p-4 bg-slate-50/50">
                                <POSStyleProductGrid
                                    searchQuery={productSearch}
                                    discounts={discounts}
                                    onSelectItem={handleAddGridItem}
                                />
                            </div>

                            {/* Current selection summary */}
                            <div className="lg:col-span-1 border rounded-xl overflow-hidden bg-white shadow-md flex flex-col h-[650px]">
                                <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
                                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                        <ShoppingCart className="w-4 h-4" /> Selection
                                    </h4>
                                    <Button variant="ghost" size="sm" onClick={() => setItems([])} className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7 px-2">
                                        Clear
                                    </Button>
                                </div>
                                <ScrollArea className="flex-1">
                                    <div className="divide-y text-slate-900">
                                        {items.length === 0 ? (
                                            <div className="p-8 text-center text-slate-400">
                                                <Package className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                                <p className="text-sm">No items added yet</p>
                                            </div>
                                        ) : (
                                            items.map((item, i) => (
                                                <div key={i} className="p-3 hover:bg-slate-50 transition-colors">
                                                    <div className="flex gap-3 mb-2">
                                                        <div className="w-12 h-12 rounded bg-slate-100 overflow-hidden flex-shrink-0 border">
                                                            {item.image ? (
                                                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <Package className="w-6 h-6 text-slate-300" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-xs truncate" title={item.name}>{item.name}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Badge variant="outline" className="px-1 py-0 h-4 text-[9px] uppercase border-slate-200 bg-slate-50">{item.size}</Badge>
                                                                <div className="flex items-center gap-1 bg-slate-50 px-1 py-0 h-4 rounded border border-slate-200">
                                                                    {item.colorHex && (
                                                                        <div
                                                                            className="w-2 h-2 rounded-full border border-slate-300"
                                                                            style={{ backgroundColor: item.colorHex }}
                                                                        />
                                                                    )}
                                                                    <span className="text-[9px] uppercase font-medium text-slate-600">{item.color}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-slate-400 hover:text-red-500"
                                                            onClick={() => removeItem(i)}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2 bg-slate-100 rounded-lg h-7 px-1">
                                                            <button
                                                                className="w-5 h-5 flex items-center justify-center hover:bg-white rounded transition-colors disabled:opacity-30"
                                                                onClick={() => updateItem(i, 'quantity', Math.max(1, item.quantity - 1))}
                                                                disabled={item.quantity <= 1}
                                                            >
                                                                <Minus className="w-3 h-3" />
                                                            </button>
                                                            <span className="w-4 text-center text-xs font-bold">{item.quantity}</span>
                                                            <button
                                                                className="w-5 h-5 flex items-center justify-center hover:bg-white rounded transition-colors"
                                                                onClick={() => updateItem(i, 'quantity', item.quantity + 1)}
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-bold text-sm text-slate-900">৳{(item.unit_price * item.quantity - (item.discount || 0)).toLocaleString()}</p>
                                                            {item.discount > 0 && (
                                                                <p className="text-[9px] text-slate-400 line-through">৳{(item.unit_price * item.quantity).toLocaleString()}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </ScrollArea>
                                <div className="p-4 bg-slate-50 border-t space-y-2">
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span>Subtotal</span>
                                        <span>৳{calculateSubtotal().toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-slate-900 border-t pt-2 mt-2">
                                        <span>Estimated Total</span>
                                        <span>৳{calculateTotal().toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <Card className="border-none shadow-md overflow-hidden">
                        <CardHeader className="bg-indigo-600 text-white">
                            <CardTitle>Review & Submit</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 grid grid-cols-1 md:grid-cols-2 divide-x">
                            <div className="p-6 space-y-6">
                                <div>
                                    <div className="font-bold text-slate-900 mb-2 flex items-center gap-2"><User className="w-4 h-4" /> Customer</div>
                                    <div className="pl-6 text-sm text-slate-600">
                                        <div className="font-medium text-slate-900">{firstName} {lastName}</div>
                                        <div>{phone}</div>
                                        <div>{email}</div>
                                    </div>
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 mb-2 flex items-center gap-2"><MapPin className="w-4 h-4" /> Shipping</div>
                                    <div className="pl-6 text-sm text-slate-600 space-y-1">
                                        <div>{address}</div>
                                        {deliveryMethod === 'inside' ? (
                                            <div>{selectedPlace}, {selectedThana}, {selectedCityCorp}</div>
                                        ) : (
                                            <div>{selectedUpazilla}, {selectedDistrict}, {selectedDivision}</div>
                                        )}
                                        <div className="inline-block bg-slate-100 px-2 py-0.5 rounded text-xs mt-1">{deliveryMethod === 'inside' ? "Inside Dhaka" : deliveryMethod === 'gazipur' ? "Inside Gazipur" : "Outside Dhaka"}</div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Notes</Label>
                                    <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes..." />
                                </div>
                            </div>
                            <div className="p-6 bg-slate-50/50">
                                <div className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Package className="w-4 h-4" /> Summary</div>
                                <div className="space-y-2 text-sm">
                                    {items.map((item, i) => (
                                        <div key={i} className="flex justify-between items-center gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded bg-white border overflow-hidden flex-shrink-0">
                                                    {item.image ? (
                                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-slate-50">
                                                            <Package className="w-4 h-4 text-slate-300" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{item.name}</span>
                                                    <span className="text-xs text-slate-500">Qty: {item.quantity} | {item.size}/{item.color}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-slate-900 block">৳{(item.unit_price * item.quantity - (item.discount || 0)).toLocaleString()}</span>
                                                {item.discount > 0 && (
                                                    <span className="text-[10px] text-green-600 font-medium line-through opacity-70">৳{(item.unit_price * item.quantity).toLocaleString()}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <Separator className="my-2" />
                                    <div className="flex justify-between">
                                        <span>Subtotal</span>
                                        <span>৳{calculateSubtotal().toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Delivery</span>
                                        <span>৳{deliveryCharge.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                                        <span>Total</span>
                                        <span>৳{calculateTotal().toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="flex justify-between mt-8">
                    <Button variant="ghost" onClick={step === 1 ? onCancel : () => setStep(step - 1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> {step === 1 ? "Cancel" : "Back"}
                    </Button>
                    <Button
                        onClick={step === 3 ? handleSubmit : () => setStep(step + 1)}
                        className="bg-indigo-600 hover:bg-indigo-700 w-32"
                        disabled={nextDisabled() || isSubmitting}
                    >
                        {step === 3 ? (isSubmitting ? "Submitting..." : "Submit Order") : "Next"} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
