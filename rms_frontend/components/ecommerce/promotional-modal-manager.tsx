"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
    CalendarIcon,
    Trash2,
    Edit,
    Plus,
    Loader2,
    Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { promotionalModalsApi, type PromotionalModal } from "@/lib/api/ecommerce";

export function PromotionalModalManager() {
    const [modals, setModals] = useState<PromotionalModal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    // Form State
    const [formData, setFormData] = useState<{
        title: string;
        description: string;
        discount_code: string;
        cta_text: string;
        cta_url: string;
        image: File | null;
        imagePreview: string | null;
        layout: string;
        color_theme: string;
        trigger: string;
        delay_seconds: number;
        frequency: string;
        start_date: Date | undefined;
        end_date: Date | undefined;
        is_active: boolean;
    }>({
        title: "",
        description: "",
        discount_code: "",
        cta_text: "Shop Now",
        cta_url: "",
        image: null,
        imagePreview: null,
        layout: "centered",
        color_theme: "light",
        trigger: "timer",
        delay_seconds: 5,
        frequency: "once_per_session",
        start_date: new Date(),
        end_date: new Date(new Date().setDate(new Date().getDate() + 7)),
        is_active: true,
    });

    const fetchModals = async () => {
        setIsLoading(true);
        try {
            const data = await promotionalModalsApi.getAll();
            setModals(data);
        } catch (error) {
            toast.error("Failed to fetch promotional modals");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchModals();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData((prev) => ({
                ...prev,
                image: file,
                imagePreview: URL.createObjectURL(file),
            }));
        }
    };

    const resetForm = () => {
        setFormData({
            title: "",
            description: "",
            discount_code: "",
            cta_text: "Shop Now",
            cta_url: "",
            image: null,
            imagePreview: null,
            layout: "centered",
            color_theme: "light",
            trigger: "timer",
            delay_seconds: 5,
            frequency: "once_per_session",
            start_date: new Date(),
            end_date: new Date(new Date().setDate(new Date().getDate() + 7)),
            is_active: true,
        });
        setEditingId(null);
    };

    const handleEdit = (modal: PromotionalModal) => {
        setEditingId(modal.id);
        setFormData({
            title: modal.title,
            description: modal.description || "",
            discount_code: modal.discount_code || "",
            cta_text: modal.cta_text,
            cta_url: modal.cta_url || "",
            image: null,
            imagePreview: modal.image_url,
            layout: modal.layout,
            color_theme: modal.color_theme,
            trigger: modal.display_rules?.trigger || "timer",
            delay_seconds: modal.display_rules?.delay_seconds || 5,
            frequency: modal.display_rules?.frequency || "once_per_session",
            start_date: new Date(modal.start_date),
            end_date: new Date(modal.end_date),
            is_active: modal.is_active,
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this modal?")) return;

        try {
            await promotionalModalsApi.delete(id);
            toast.success("Modal deleted successfully");
            fetchModals();
        } catch (error) {
            toast.error("Error deleting modal");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.start_date || !formData.end_date) {
            toast.error("Title and dates are required");
            return;
        }

        setIsSubmitting(true);

        // Display rules
        const displayRules = {
            trigger: formData.trigger,
            delay_seconds: Number(formData.delay_seconds),
            frequency: formData.frequency,
        };

        const modalData = {
            title: formData.title,
            description: formData.description,
            discount_code: formData.discount_code,
            cta_text: formData.cta_text,
            cta_url: formData.cta_url,
            layout: formData.layout,
            color_theme: formData.color_theme,
            start_date: formData.start_date.toISOString(),
            end_date: formData.end_date.toISOString(),
            is_active: formData.is_active,
            display_rules: displayRules,
            image: formData.image || undefined,
        };

        try {
            if (editingId) {
                await promotionalModalsApi.update({
                    id: editingId,
                    ...modalData
                });
                toast.success("Modal updated");
            } else {
                await promotionalModalsApi.create(modalData);
                toast.success("Modal created");
            }
            setIsDialogOpen(false);
            resetForm();
            fetchModals();
        } catch (error) {
            console.error(error);
            toast.error("Failed to save modal");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                            <ImageIcon className="h-5 w-5" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Promotional Modals</h1>
                    </div>
                    <p className="text-sm text-slate-500">
                        Manage interactive storefront popups for flash sales, newsletters, and announcements.
                    </p>
                </div>
                <Dialog
                    open={isDialogOpen}
                    onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) resetForm();
                    }}
                >
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs">
                            <Plus className="mr-2 h-4 w-4" /> Create Popup Modal
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editingId ? "Edit Modal" : "Create New Promotional Modal"}
                            </DialogTitle>
                            <DialogDescription>
                                Configure the content, look, and timing of your popup.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Title</Label>
                                    <Input
                                        value={formData.title}
                                        onChange={(e) =>
                                            setFormData({ ...formData, title: e.target.value })
                                        }
                                        placeholder="e.g. Summer Sale!"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Discount Code (Optional)</Label>
                                    <Input
                                        value={formData.discount_code}
                                        onChange={(e) =>
                                            setFormData({ ...formData, discount_code: e.target.value })
                                        }
                                        placeholder="e.g. SUMMER24"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                    placeholder="Enter details about the offer..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>CTA Text</Label>
                                    <Input
                                        value={formData.cta_text}
                                        onChange={(e) =>
                                            setFormData({ ...formData, cta_text: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>CTA URL</Label>
                                    <Input
                                        value={formData.cta_url}
                                        onChange={(e) =>
                                            setFormData({ ...formData, cta_url: e.target.value })
                                        }
                                        placeholder="/collection/summer"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Layout</Label>
                                    <Select
                                        value={formData.layout}
                                        onValueChange={(val) =>
                                            setFormData({ ...formData, layout: val })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="centered">Centered</SelectItem>
                                            <SelectItem value="split-left">
                                                Split (Image Left)
                                            </SelectItem>
                                            <SelectItem value="split-right">
                                                Split (Image Right)
                                            </SelectItem>
                                            <SelectItem value="full-cover">Full Cover Image</SelectItem>
                                            <SelectItem value="image-only">Image Only</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Color Theme</Label>
                                    <Select
                                        value={formData.color_theme}
                                        onValueChange={(val) =>
                                            setFormData({ ...formData, color_theme: val })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="light">Light Mode</SelectItem>
                                            <SelectItem value="dark">Dark Mode</SelectItem>
                                            <SelectItem value="brand">Brand Colors</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Image (Optional)</Label>
                                <div className="flex items-center gap-4">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="cursor-pointer"
                                    />
                                    {formData.imagePreview && (
                                        <div className="relative h-12 w-12 rounded overflow-hidden border">
                                            <Image
                                                src={formData.imagePreview}
                                                alt="Preview"
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="font-medium">Display Rules</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Trigger</Label>
                                        <Select
                                            value={formData.trigger}
                                            onValueChange={(val) =>
                                                setFormData({ ...formData, trigger: val })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="timer">Timer Delay</SelectItem>
                                                <SelectItem value="exit_intent">Exit Intent</SelectItem>
                                                <SelectItem value="first_visit">First Visit</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {formData.trigger === "timer" && (
                                        <div className="space-y-2">
                                            <Label>Delay (Seconds)</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={formData.delay_seconds}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        delay_seconds: parseInt(e.target.value),
                                                    })
                                                }
                                            />
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Label>Frequency</Label>
                                        <Select
                                            value={formData.frequency}
                                            onValueChange={(val) =>
                                                setFormData({ ...formData, frequency: val })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="once_per_session">
                                                    Once per Session
                                                </SelectItem>
                                                <SelectItem value="once_ever">Once Ever</SelectItem>
                                                <SelectItem value="always">Always</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Start Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !formData.start_date && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {formData.start_date ? (
                                                    format(formData.start_date, "PPP")
                                                ) : (
                                                    <span>Pick a date</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={formData.start_date}
                                                onSelect={(date) =>
                                                    setFormData({ ...formData, start_date: date })
                                                }
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label>End Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !formData.end_date && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {formData.end_date ? (
                                                    format(formData.end_date, "PPP")
                                                ) : (
                                                    <span>Pick a date</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={formData.end_date}
                                                onSelect={(date) =>
                                                    setFormData({ ...formData, end_date: date })
                                                }
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={formData.is_active}
                                    onCheckedChange={(checked) =>
                                        setFormData({ ...formData, is_active: checked })
                                    }
                                />
                                <Label>Active</Label>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                                    Save Modal
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="animate-spin h-8 w-8 text-primary" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {modals.map((modal) => (
                        <Card key={modal.id} className="relative overflow-hidden group rounded-2xl border border-slate-200/90 shadow-2xs bg-white hover:border-slate-300 transition-all flex flex-col justify-between">
                            <div>
                                {modal.image_url && (
                                    <div className="relative h-36 w-full bg-slate-100 border-b border-slate-100 overflow-hidden">
                                        <Image
                                            src={modal.image_url}
                                            alt={modal.title}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <div className="absolute inset-0 bg-slate-900/20" />
                                    </div>
                                )}
                                <CardHeader className={cn(modal.image_url ? "p-5" : "p-5")}>
                                    <CardTitle className="flex justify-between items-start gap-2">
                                        <span className="line-clamp-1 text-base font-semibold text-slate-900">{modal.title}</span>
                                        <span
                                            className={cn(
                                                "text-xs px-2.5 py-0.5 rounded-full border font-medium",
                                                modal.is_active
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                            )}
                                        >
                                            {modal.is_active ? "Active" : "Inactive"}
                                        </span>
                                    </CardTitle>
                                    <CardDescription className="line-clamp-2 text-xs text-slate-500 mt-1">
                                        {modal.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="px-5 pb-4 pt-0">
                                    <div className="text-xs space-y-1.5 text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                                        <p>
                                            <strong className="font-semibold text-slate-800">Trigger:</strong> {modal.display_rules.trigger}{" "}
                                            {modal.display_rules.trigger === "timer" &&
                                                `(${modal.display_rules.delay_seconds}s delay)`}
                                        </p>
                                        <p>
                                            <strong className="font-semibold text-slate-800">Layout:</strong> {modal.layout}
                                        </p>
                                        <p className="text-slate-400 text-[11px] pt-1 border-t border-slate-200/60">
                                            {format(new Date(modal.start_date), "MMM d")} –{" "}
                                            {format(new Date(modal.end_date), "MMM d, yyyy")}
                                        </p>
                                    </div>
                                </CardContent>
                            </div>
                            <CardFooter className="flex justify-end gap-2 p-4 border-t border-slate-100 bg-slate-50/40">
                                <Button size="sm" variant="outline" onClick={() => handleEdit(modal)} className="rounded-xl border-slate-200 text-xs">
                                    <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl h-8 w-8 p-0"
                                    onClick={() => handleDelete(modal.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                    {modals.length === 0 && (
                        <div className="col-span-full py-16 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200 shadow-2xs">
                            <ImageIcon className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                            <p className="font-medium text-slate-700">No promotional modals configured</p>
                            <p className="text-xs text-slate-400 mt-1">Create an interactive popup modal for announcements or flash sales.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
