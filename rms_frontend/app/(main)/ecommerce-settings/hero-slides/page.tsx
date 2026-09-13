"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import {
  ImageIcon,
  Plus,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Eye,
  ArrowRight,
  Monitor,
  Smartphone,
  Maximize2,
  X,
} from "lucide-react"

import { useToast } from "@/hooks/use-toast"
import { useHeroSlides, useCreateHeroSlide, useUpdateHeroSlide, useDeleteHeroSlide } from "@/hooks/queries/useEcommerce"
import type { HeroSlide, CreateHeroSlideDTO } from "@/lib/api/ecommerce"

const LAYOUT_OPTIONS = [
  { value: "clean-left", label: "Clean Left" },
  { value: "centered-clean", label: "Centered Clean" },
  { value: "split-clean", label: "Split Clean" },
  { value: "image-showcase", label: "Image Showcase" },
  { value: "bold-left", label: "Bold Left" },
]

const BG_COLOR_OPTIONS = [
  { value: "bg-slate-950", label: "Slate 950", color: "#020617" },
  { value: "bg-orange-950", label: "Orange 950", color: "#431407" },
  { value: "bg-purple-950", label: "Purple 950", color: "#3b0764" },
  { value: "bg-emerald-950", label: "Emerald 950", color: "#022c22" },
  { value: "bg-slate-900", label: "Slate 900", color: "#0f172a" },
  { value: "bg-blue-950", label: "Blue 950", color: "#172554" },
  { value: "bg-red-950", label: "Red 950", color: "#450a0a" },
  { value: "bg-green-950", label: "Green 950", color: "#022c22" },
]

const TITLE_SIZE_OPTIONS = [
  { value: "extra-large", label: "Extra Large", class: "text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl" },
  { value: "large", label: "Large", class: "text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl" },
  { value: "medium", label: "Medium", class: "text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl" },
  { value: "small", label: "Small", class: "text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl" },
]

const SUBTITLE_SIZE_OPTIONS = [
  { value: "large", label: "Large", class: "text-base sm:text-lg md:text-xl" },
  { value: "medium", label: "Medium", class: "text-sm sm:text-base md:text-lg" },
  { value: "small", label: "Small", class: "text-xs sm:text-sm md:text-base" },
]

const HERO_PRESETS = [
  {
    key: "clean-left",
    name: "Find Your Style",
    description: "Clean left layout with bold numbers",
    layout: "clean-left",
    bg_color: "bg-slate-950",
    title: "FIND YOUR\nSTYLE",
    subtitle: "Discover meticulously crafted garments designed for you",
    button_text: "Shop Now",
    stats: [
      { value: "200+", label: "Brands" },
      { value: "2K+", label: "Products" },
      { value: "30K+", label: "Customers" },
    ],
  },
  {
    key: "centered-clean",
    name: "Summer Vibes",
    description: "Centered hero with two stats",
    layout: "centered-clean",
    bg_color: "bg-orange-950",
    title: "SUMMER\nVIBES",
    subtitle: "Fresh seasonal styles with vibrant colors and breathable fabrics",
    button_text: "Explore",
    stats: [
      { value: "500+", label: "Pieces" },
      { value: "40%", label: "Off" },
    ],
  },
  {
    key: "split-clean",
    name: "Pure Luxury",
    description: "Split layout with image on the right",
    layout: "split-clean",
    bg_color: "bg-purple-950",
    title: "PURE\nLUXURY",
    subtitle: "Exclusive designer pieces that elevate your wardrobe",
    button_text: "Discover",
    stats: [
      { value: "100+", label: "Designers" },
      { value: "Limited", label: "Drops" },
    ],
  },
  {
    key: "image-showcase",
    name: "Sustainable Fashion",
    description: "Image-first layout with stats grid",
    layout: "image-showcase",
    bg_color: "bg-emerald-950",
    title: "SUSTAINABLE\nFASHION",
    subtitle: "Eco-friendly collection with organic materials",
    button_text: "Shop Green",
    stats: [
      { value: "100%", label: "Organic" },
      { value: "Fair", label: "Trade" },
    ],
  },
  {
    key: "bold-left",
    name: "Workwear Essentials",
    description: "Bold left layout for professional looks",
    layout: "bold-left",
    bg_color: "bg-slate-900",
    title: "WORKWEAR\nESSENTIALS",
    subtitle: "Professional pieces that work as hard as you do",
    button_text: "Browse",
    stats: [
      { value: "150+", label: "Styles" },
      { value: "All", label: "Sizes" },
    ],
  },
  {
    key: "minimal-dark",
    name: "Minimal Dark",
    description: "Dark minimal layout with centered text",
    layout: "centered-clean",
    bg_color: "bg-slate-950",
    title: "LESS IS\nMORE",
    subtitle: "Essential pieces for the modern wardrobe",
    button_text: "Shop Essentials",
    stats: [],
  },
  {
    key: "vibrant-pop",
    name: "Vibrant Pop",
    description: "Bold layout with high contrast",
    layout: "bold-left",
    bg_color: "bg-blue-950",
    title: "SUMMER\nCOLLECTION",
    subtitle: "Stand out this season with our boldest prints yet",
    button_text: "Get The Look",
    stats: [
      { value: "New", label: "Arrivals" },
      { value: "Hot", label: "Trends" },
    ],
  },
  {
    key: "urban-style",
    name: "Urban Style",
    description: "Streetwear aesthetic with red accents",
    layout: "split-clean",
    bg_color: "bg-red-950",
    title: "URBAN\nLEGEND",
    subtitle: "Dominate the streets with premium streetwear",
    button_text: "Shop Street",
    stats: [
      { value: "50+", label: "Brands" },
      { value: "24/7", label: "Style" },
    ],
  },
  {
    key: "eco-conscious",
    name: "Eco Conscious",
    description: "Green themed sustainable layout",
    layout: "image-showcase",
    bg_color: "bg-green-950",
    title: "EARTH\nFIRST",
    subtitle: "Fashion that respects the planet we live on",
    button_text: "Join Movement",
    stats: [
      { value: "0%", label: "Carbon" },
      { value: "100%", label: "Recycled" },
    ],
  },
  {
    key: "night-life",
    name: "Night Life",
    description: "Dark, bold layout for nightlife fashion",
    layout: "bold-left",
    bg_color: "bg-slate-950",
    title: "CITY\nNIGHTS",
    subtitle: "Own the night with our exclusive evening collection",
    button_text: "Shop Party",
    stats: [
      { value: "New", label: "Arrivals" },
      { value: "Limited", label: "Edition" },
    ],
  },
  {
    key: "sport-mode",
    name: "Sport Mode",
    description: "High energy layout for activewear",
    layout: "split-clean",
    bg_color: "bg-blue-950",
    title: "PUSH\nLIMITS",
    subtitle: "Performance gear designed for the toughest workouts",
    button_text: "Get Active",
    stats: [
      { value: "100%", label: "Breathable" },
      { value: "Pro", label: "Grade" },
    ],
  },
  {
    key: "tech-minimal",
    name: "Tech Minimal",
    description: "Clean, futuristic layout for tech wear",
    layout: "clean-left",
    bg_color: "bg-slate-900",
    title: "FUTURE\nREADY",
    subtitle: "Advanced materials meet modern utility",
    button_text: "Discover",
    stats: [
      { value: "Water", label: "Proof" },
      { value: "Tech", label: "Wear" },
    ],
  },
  {
    key: "fashion-editorial",
    name: "Fashion Editorial",
    description: "Elegant layout for high fashion",
    layout: "centered-clean",
    bg_color: "bg-purple-950",
    title: "VOGUE\nSTYLE",
    subtitle: "Trends straight from the runway to your wardrobe",
    button_text: "View Collection",
    stats: [
      { value: "SS24", label: "Collection" },
      { value: "Runway", label: "Pieces" },
    ],
  },
  // NEW PRESETS START HERE
  {
    key: "luxury-timepieces",
    name: "Luxury Timepieces",
    description: "Premium watch collection showcase",
    layout: "image-showcase",
    bg_color: "bg-slate-950",
    title: "TIME\nELEGANCE",
    subtitle: "Swiss craftsmanship meets timeless design in our curated collection",
    button_text: "Explore Watches",
    stats: [
      { value: "Since", label: "1890" },
      { value: "Swiss", label: "Made" },
    ],
  },
  {
    key: "vintage-treasures",
    name: "Vintage Treasures",
    description: "Retro fashion revival",
    layout: "split-clean",
    bg_color: "bg-orange-950",
    title: "VINTAGE\nVIBE",
    subtitle: "Timeless classics from past decades reimagined for today",
    button_text: "Shop Vintage",
    stats: [
      { value: "60s-90s", label: "Era" },
      { value: "Authentic", label: "Pieces" },
    ],
  },
  {
    key: "kids-paradise",
    name: "Kids Paradise",
    description: "Fun children's collection",
    layout: "centered-clean",
    bg_color: "bg-blue-950",
    title: "KIDS\nDREAMS",
    subtitle: "Playful, comfortable, and durable fashion for your little ones",
    button_text: "Shop Kids",
    stats: [
      { value: "0-12", label: "Years" },
      { value: "Safe", label: "Materials" },
    ],
  },
  {
    key: "bridal-elegance",
    name: "Bridal Elegance",
    description: "Wedding and bridal collection",
    layout: "image-showcase",
    bg_color: "bg-slate-950",
    title: "YOUR\nMOMENT",
    subtitle: "Exquisite bridal gowns and accessories for your special day",
    button_text: "Book Fitting",
    stats: [
      { value: "Custom", label: "Made" },
      { value: "Luxury", label: "Fabrics" },
    ],
  },
  {
    key: "denim-revolution",
    name: "Denim Revolution",
    description: "Premium denim showcase",
    layout: "bold-left",
    bg_color: "bg-blue-950",
    title: "DENIM\nREBORN",
    subtitle: "Premium selvedge denim crafted by master artisans",
    button_text: "Shop Denim",
    stats: [
      { value: "Raw", label: "Selvedge" },
      { value: "Japan", label: "Fabric" },
      { value: "Hand", label: "Crafted" },
    ],
  },
  {
    key: "accessory-heaven",
    name: "Accessory Heaven",
    description: "Bags, belts, and accessories",
    layout: "clean-left",
    bg_color: "bg-red-950",
    title: "THE\nDETAILS",
    subtitle: "Complete your look with statement accessories",
    button_text: "Browse All",
    stats: [
      { value: "1000+", label: "Styles" },
      { value: "New", label: "Daily" },
    ],
  },
  {
    key: "winter-warmth",
    name: "Winter Warmth",
    description: "Cozy winter collection",
    layout: "centered-clean",
    bg_color: "bg-slate-900",
    title: "WINTER\nWARMTH",
    subtitle: "Stay cozy and stylish through the coldest months",
    button_text: "Shop Winter",
    stats: [
      { value: "Down", label: "Insulated" },
      { value: "-30°C", label: "Rated" },
    ],
  },
  {
    key: "resort-escape",
    name: "Resort Escape",
    description: "Vacation and resort wear",
    layout: "split-clean",
    bg_color: "bg-emerald-950",
    title: "RESORT\nREADY",
    subtitle: "Effortless vacation styles for tropical getaways",
    button_text: "Pack Now",
    stats: [
      { value: "Beach", label: "Ready" },
      { value: "Light", label: "Weight" },
    ],
  },
  {
    key: "athleisure-fusion",
    name: "Athleisure Fusion",
    description: "Gym to street versatile wear",
    layout: "bold-left",
    bg_color: "bg-slate-950",
    title: "MOVE\nFREELY",
    subtitle: "Where performance meets everyday style seamlessly",
    button_text: "Shop Range",
    stats: [
      { value: "4-Way", label: "Stretch" },
      { value: "Moisture", label: "Wicking" },
    ],
  },
  {
    key: "leather-luxury",
    name: "Leather Luxury",
    description: "Premium leather goods",
    layout: "image-showcase",
    bg_color: "bg-orange-950",
    title: "LEATHER\nCRAFT",
    subtitle: "Full-grain leather pieces that age beautifully with time",
    button_text: "Discover",
    stats: [
      { value: "Italian", label: "Leather" },
      { value: "Hand", label: "Stitched" },
    ],
  },
  {
    key: "jewelry-sparkle",
    name: "Jewelry Sparkle",
    description: "Fine jewelry collection",
    layout: "centered-clean",
    bg_color: "bg-purple-950",
    title: "SHINE\nBRIGHT",
    subtitle: "Ethically sourced gems set in precious metals",
    button_text: "View Collection",
    stats: [
      { value: "Lab", label: "Grown" },
      { value: "Conflict", label: "Free" },
    ],
  },
  {
    key: "formal-power",
    name: "Formal Power",
    description: "Business and formal attire",
    layout: "clean-left",
    bg_color: "bg-slate-950",
    title: "POWER\nDRESSED",
    subtitle: "Impeccably tailored suits and formal wear for the boardroom",
    button_text: "Shop Suits",
    stats: [
      { value: "Bespoke", label: "Tailoring" },
      { value: "Italian", label: "Wool" },
      { value: "48HR", label: "Service" },
    ],
  },
  {
    key: "casual-comfort",
    name: "Casual Comfort",
    description: "Relaxed everyday wear",
    layout: "split-clean",
    bg_color: "bg-blue-950",
    title: "EASY\nLIVING",
    subtitle: "Comfortable essentials for laid-back weekends",
    button_text: "Shop Casual",
    stats: [
      { value: "Soft", label: "Cotton" },
      { value: "Relaxed", label: "Fit" },
    ],
  },
  {
    key: "plus-inclusive",
    name: "Plus Inclusive",
    description: "Inclusive sizing for all",
    layout: "bold-left",
    bg_color: "bg-green-950",
    title: "ALL\nBODIES",
    subtitle: "Trendy fashion designed to fit and flatter every curve",
    button_text: "Find Your Size",
    stats: [
      { value: "XS-5XL", label: "Sizes" },
      { value: "Every", label: "Body" },
    ],
  },
  {
    key: "outdoor-adventure",
    name: "Outdoor Adventure",
    description: "Technical outdoor gear",
    layout: "image-showcase",
    bg_color: "bg-emerald-950",
    title: "WILD\nCALLING",
    subtitle: "Rugged technical gear for mountain, trail, and backcountry",
    button_text: "Gear Up",
    stats: [
      { value: "Gore-Tex", label: "Certified" },
      { value: "Trail", label: "Tested" },
    ],
  },
  {
    key: "maternity-style",
    name: "Maternity Style",
    description: "Stylish maternity wear",
    layout: "centered-clean",
    bg_color: "bg-slate-900",
    title: "BUMP\nSTYLE",
    subtitle: "Comfortable and chic fashion for every trimester",
    button_text: "Shop Maternity",
    stats: [
      { value: "Stretch", label: "Panels" },
      { value: "Growing", label: "With You" },
    ],
  },
  {
    key: "streetwear-culture",
    name: "Streetwear Culture",
    description: "Urban streetwear drops",
    layout: "bold-left",
    bg_color: "bg-red-950",
    title: "STREET\nCULTURE",
    subtitle: "Limited drops and collaborations from underground artists",
    button_text: "Cop Now",
    stats: [
      { value: "Weekly", label: "Drops" },
      { value: "Sold", label: "Out Fast" },
      { value: "Hype", label: "Collabs" },
    ],
  },
  {
    key: "minimalist-core",
    name: "Minimalist Core",
    description: "Essential minimalist wardrobe",
    layout: "clean-left",
    bg_color: "bg-slate-950",
    title: "CORE\nESSENTIALS",
    subtitle: "Build your perfect capsule wardrobe with timeless basics",
    button_text: "Start Simple",
    stats: [
      { value: "10", label: "Pieces" },
      { value: "100", label: "Outfits" },
    ],
  },
  {
    key: "festival-ready",
    name: "Festival Ready",
    description: "Music festival fashion",
    layout: "split-clean",
    bg_color: "bg-purple-950",
    title: "FESTIVAL\nVIBES",
    subtitle: "Bold, bohemian styles perfect for music festivals",
    button_text: "Get Festival Ready",
    stats: [
      { value: "Boho", label: "Chic" },
      { value: "Dance", label: "Ready" },
    ],
  },
  {
    key: "smart-casual",
    name: "Smart Casual",
    description: "Business casual perfection",
    layout: "image-showcase",
    bg_color: "bg-slate-900",
    title: "SMART\nCASUAL",
    subtitle: "The perfect balance between professional and relaxed",
    button_text: "Shop Style",
    stats: [
      { value: "Office", label: "Ready" },
      { value: "Weekend", label: "Proof" },
    ],
  },
  {
    key: "heritage-craft",
    name: "Heritage Craft",
    description: "Traditional craftsmanship",
    layout: "centered-clean",
    bg_color: "bg-orange-950",
    title: "HERITAGE\nCRAFT",
    subtitle: "Artisan-made pieces using centuries-old techniques",
    button_text: "Discover Craft",
    stats: [
      { value: "100+", label: "Years" },
      { value: "Hand", label: "Made" },
    ],
  },
  {
    key: "gender-neutral",
    name: "Gender Neutral",
    description: "Inclusive unisex fashion",
    layout: "bold-left",
    bg_color: "bg-slate-950",
    title: "NO\nLABELS",
    subtitle: "Fashion without boundaries for everyone to express themselves",
    button_text: "Shop All",
    stats: [
      { value: "For", label: "Everyone" },
      { value: "Free", label: "Expression" },
    ],
  },
  {
    key: "beach-lifestyle",
    name: "Beach Lifestyle",
    description: "Coastal living fashion",
    layout: "split-clean",
    bg_color: "bg-blue-950",
    title: "BEACH\nLIFE",
    subtitle: "Effortless coastal style for sun, sand, and sea",
    button_text: "Shop Beach",
    stats: [
      { value: "UV", label: "Protected" },
      { value: "Quick", label: "Dry" },
    ],
  },
  {
    key: "gothic-edge",
    name: "Gothic Edge",
    description: "Dark alternative fashion",
    layout: "clean-left",
    bg_color: "bg-slate-950",
    title: "DARK\nELEGANCE",
    subtitle: "Gothic and alternative fashion for those who embrace the darkness",
    button_text: "Enter",
    stats: [
      { value: "Dark", label: "Aesthetic" },
      { value: "Alt", label: "Culture" },
    ],
  },
  {
    key: "business-travel",
    name: "Business Travel",
    description: "Wrinkle-free travel wear",
    layout: "image-showcase",
    bg_color: "bg-slate-900",
    title: "TRAVEL\nSMART",
    subtitle: "Wrinkle-resistant, packable essentials for business travelers",
    button_text: "Pack Smart",
    stats: [
      { value: "No", label: "Wrinkles" },
      { value: "Pack", label: "Light" },
    ],
  },
  {
    key: "sneaker-culture",
    name: "Sneaker Culture",
    description: "Exclusive sneaker drops",
    layout: "centered-clean",
    bg_color: "bg-red-950",
    title: "SNEAKER\nHEADS",
    subtitle: "Limited edition drops and rare collaborations",
    button_text: "Enter Raffle",
    stats: [
      { value: "Limited", label: "Edition" },
      { value: "Instant", label: "Classics" },
    ],
  },
  {
    key: "preppy-classic",
    name: "Preppy Classic",
    description: "Timeless preppy style",
    layout: "bold-left",
    bg_color: "bg-blue-950",
    title: "PREPPY\nCLASSIC",
    subtitle: "Ivy League inspired classics with modern refinement",
    button_text: "Shop Prep",
    stats: [
      { value: "Ivy", label: "League" },
      { value: "Timeless", label: "Style" },
    ],
  },
  {
    key: "loungewear-luxe",
    name: "Loungewear Luxe",
    description: "Premium comfort wear",
    layout: "split-clean",
    bg_color: "bg-purple-950",
    title: "LUXE\nLOUNGE",
    subtitle: "Elevated loungewear in the softest fabrics",
    button_text: "Get Cozy",
    stats: [
      { value: "Cashmere", label: "Blend" },
      { value: "Cloud", label: "Soft" },
    ],
  },
]

const TITLE_WEIGHT_OPTIONS = [
  { value: "black", label: "Black (Boldest)", class: "font-black" },
  { value: "bold", label: "Bold", class: "font-bold" },
  { value: "semibold", label: "Semi Bold", class: "font-semibold" },
]

const TITLE_LEADING_OPTIONS = [
  { value: "tight", label: "Tight", class: "leading-tight" },
  { value: "normal", label: "Normal", class: "leading-normal" },
  { value: "relaxed", label: "Relaxed", class: "leading-relaxed" },
  { value: "none", label: "None", class: "leading-none" },
]

// Helper function to generate title class
const generateTitleClass = (size: string, weight: string, leading: string) => {
  const sizeClass = TITLE_SIZE_OPTIONS.find((opt) => opt.value === size)?.class || TITLE_SIZE_OPTIONS[0].class
  const weightClass = TITLE_WEIGHT_OPTIONS.find((opt) => opt.value === weight)?.class || TITLE_WEIGHT_OPTIONS[0].class
  const leadingClass =
    TITLE_LEADING_OPTIONS.find((opt) => opt.value === leading)?.class || TITLE_LEADING_OPTIONS[0].class
  return `${sizeClass} ${weightClass} text-white ${leadingClass} tracking-tighter`
}

// Helper function to generate subtitle class
const generateSubtitleClass = (size: string) => {
  const sizeClass = SUBTITLE_SIZE_OPTIONS.find((opt) => opt.value === size)?.class || SUBTITLE_SIZE_OPTIONS[1].class
  return `${sizeClass} text-white/80 max-w-lg leading-relaxed`
}

// Preview Component - Matches hero-section design exactly
interface HeroSlidePreviewProps {
  title: string
  subtitle?: string
  buttonText: string
  image: string
  bgColor: string
  layout: string
  titleClass: string
  subtitleClass: string
  stats: Array<{ value: string; label: string }>
}

function HeroSlidePreview({
  title,
  subtitle,
  buttonText,
  image,
  bgColor,
  layout,
  titleClass,
  subtitleClass,
  stats,
}: HeroSlidePreviewProps) {
  const renderLayout = () => {
    if (layout === "clean-left") {
      return (
        <div className="container relative z-10 px-4 py-8 sm:py-12 md:py-0 h-full flex items-center">
          <div className="max-w-2xl space-y-4 sm:space-y-6 md:space-y-8">
            <h1 className={titleClass}>{title}</h1>
            {subtitle && <p className={subtitleClass}>{subtitle}</p>}
            <Button
              size="lg"
              className="rounded-full px-6 sm:px-8 h-12 sm:h-14 bg-white text-black hover:bg-white/90 font-bold text-sm sm:text-base"
            >
              {buttonText}
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            {stats.length > 0 && (
              <div className="flex gap-4 sm:gap-8 pt-2 sm:pt-4">
                {stats.map((stat, idx) => (
                  <div key={idx} className="text-white">
                    <div className="text-2xl sm:text-3xl lg:text-4xl font-black">{stat.value}</div>
                    <div className="text-white/60 text-xs sm:text-sm mt-1 font-medium">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )
    } else if (layout === "centered-clean") {
      return (
        <div className="container relative z-10 px-4 py-8 sm:py-12 md:py-0 h-full flex flex-col items-center justify-center text-center">
          <div className="max-w-3xl space-y-4 sm:space-y-6 md:space-y-8">
            <h1 className={titleClass}>{title}</h1>
            {subtitle && <p className={subtitleClass}>{subtitle}</p>}
            <Button
              size="lg"
              className="rounded-full px-6 sm:px-8 h-12 sm:h-14 bg-white text-black hover:bg-white/90 font-bold text-sm sm:text-base"
            >
              {buttonText}
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            {stats.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-12 pt-2 sm:pt-4 justify-center">
                {stats.map((stat, idx) => (
                  <div key={idx} className="text-white">
                    <div className="text-2xl sm:text-3xl font-black">{stat.value}</div>
                    <div className="text-white/60 text-xs sm:text-sm mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )
    } else if (layout === "split-clean") {
      return (
        <div className="container relative z-10 px-4 py-8 sm:py-12 md:py-0 h-full flex items-center">
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 md:gap-12 items-center w-full">
            <div className="space-y-4 sm:space-y-6 md:space-y-8">
              <h1 className={titleClass}>{title}</h1>
              {subtitle && <p className={subtitleClass}>{subtitle}</p>}
              <Button
                size="lg"
                className="rounded-full px-6 sm:px-8 h-12 sm:h-14 bg-white text-black hover:bg-white/90 font-bold text-sm sm:text-base"
              >
                {buttonText}
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              {stats.length > 0 && (
                <div className="flex gap-4 sm:gap-6">
                  {stats.map((stat, idx) => (
                    <div key={idx} className="text-white">
                      <div className="text-xl sm:text-2xl font-black">{stat.value}</div>
                      <div className="text-white/60 text-xs sm:text-sm mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="relative h-60 sm:h-72 md:h-80 rounded-xl sm:rounded-2xl overflow-hidden">
              <img src={image || "/placeholder.svg"} alt={title} className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      )
    } else if (layout === "image-showcase") {
      return (
        <div className="container relative z-10 px-4 py-8 sm:py-12 md:py-0 h-full flex items-center">
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 md:gap-12 items-center w-full">
            <div className="relative h-60 sm:h-72 md:h-80 rounded-xl sm:rounded-2xl overflow-hidden order-2">
              <img src={image || "/placeholder.svg"} alt={title} className="w-full h-full object-cover" />
            </div>
            <div className="space-y-4 sm:space-y-6 md:space-y-8 order-1 lg:order-2">
              <h1 className={titleClass}>{title}</h1>
              {subtitle && <p className={subtitleClass}>{subtitle}</p>}
              <Button
                size="lg"
                className="rounded-full px-6 sm:px-8 h-12 sm:h-14 bg-white text-black hover:bg-white/90 font-bold text-sm sm:text-base"
              >
                {buttonText}
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              {stats.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                  {stats.map((stat, idx) => (
                    <div key={idx} className="bg-white/10 rounded-lg p-3 sm:p-4">
                      <div className="text-lg sm:text-2xl font-black text-white">{stat.value}</div>
                      <div className="text-white/60 text-xs sm:text-sm mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )
    } else if (layout === "bold-left") {
      return (
        <div className="container relative z-10 px-4 py-8 sm:py-12 md:py-0 h-full flex items-center">
          <div className="max-w-2xl space-y-4 sm:space-y-6 md:space-y-8">
            <h1 className={titleClass}>{title}</h1>
            {subtitle && <p className={subtitleClass}>{subtitle}</p>}
            <Button
              size="lg"
              className="rounded-full px-6 sm:px-8 h-12 sm:h-14 bg-white text-black hover:bg-white/90 font-bold text-sm sm:text-base"
            >
              {buttonText}
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            {stats.length > 0 && (
              <div className="flex gap-4 sm:gap-8 pt-2 sm:pt-4">
                {stats.map((stat, idx) => (
                  <div key={idx} className="text-white">
                    <div className="text-2xl sm:text-3xl font-black">{stat.value}</div>
                    <div className="text-white/60 text-xs sm:text-sm mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div
      className={`relative w-full h-full overflow-hidden ${bgColor} transition-colors duration-500`}
      style={{ minHeight: "400px" }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/50" />
      <img
        src={image || "/placeholder.svg"}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover opacity-40"
      />
      {renderLayout()}
    </div>
  )
}

export default function HeroSlidesPage() {
  const { toast } = useToast()
  const { data: slides, isLoading } = useHeroSlides()
  const createMutation = useCreateHeroSlide()
  const updateMutation = useUpdateHeroSlide()
  const deleteMutation = useDeleteHeroSlide()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null)
  const [formData, setFormData] = useState<Partial<CreateHeroSlideDTO>>({
    title: "",
    subtitle: "",
    button_text: "Shop Now",
    bg_color: "bg-slate-950",
    layout: "clean-left",
    title_class:
      "text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black text-white leading-tight tracking-tighter",
    subtitle_class: "text-sm sm:text-base text-white/80 max-w-lg leading-relaxed",
    stats: [],
    display_order: 0,
    is_active: true,
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [stats, setStats] = useState<Array<{ value: string; label: string }>>([])
  const [isFullscreenPreviewOpen, setIsFullscreenPreviewOpen] = useState(false)
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop")
  const containerRef = useState<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(1)

  // Measure container for scaling
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!containerEl) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width
        const height = entry.contentRect.height
        // Calculate scale to fit BOTH width and height (contain)
        // We use 1920x1080 as the reference design size
        const scaleX = width / 1920
        const scaleY = height / 1080

        // Use the smaller scale to ensure it fits entirely
        const newScale = Math.min(scaleX, scaleY, 1) * 0.95 // 0.95 for a small margin
        setScale(newScale)
      }
    })
    observer.observe(containerEl)
    return () => observer.disconnect()
  }, [containerEl])

  // User-friendly styling options
  const [titleSize, setTitleSize] = useState("extra-large")
  const [titleWeight, setTitleWeight] = useState("black")
  const [titleLeading, setTitleLeading] = useState("tight")
  const [subtitleSize, setSubtitleSize] = useState("medium")

  const applyPreset = (preset: (typeof HERO_PRESETS)[number]) => {
    setFormData((prev) => ({
      ...prev,
      title: preset.title,
      subtitle: preset.subtitle,
      button_text: preset.button_text,
      bg_color: preset.bg_color,
      layout: preset.layout as any,
      stats: preset.stats,
      display_order: prev.display_order ?? slides?.length ?? 0,
      is_active: prev.is_active ?? true,
    }))
    setStats(preset.stats || [])
    // Reset styling to defaults for consistency
    setTitleSize("extra-large")
    setTitleWeight("black")
    setTitleLeading("tight")
    setSubtitleSize("medium")
  }

  // Update title and subtitle classes when styling options change
  useEffect(() => {
    const titleClass = generateTitleClass(titleSize, titleWeight, titleLeading)
    const subtitleClass = generateSubtitleClass(subtitleSize)
    setFormData((prev) => ({
      ...prev,
      title_class: titleClass,
      subtitle_class: subtitleClass,
    }))
  }, [titleSize, titleWeight, titleLeading, subtitleSize])

  const resetForm = () => {
    setFormData({
      title: "",
      subtitle: "",
      button_text: "Shop Now",
      bg_color: "bg-slate-950",
      layout: "clean-left",
      title_class:
        "text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black text-white leading-tight tracking-tighter",
      subtitle_class: "text-sm sm:text-base text-white/80 max-w-lg leading-relaxed",
      stats: [],
      display_order: slides?.length || 0,
      is_active: true,
    })
    setImageFile(null)
    setStats([])
    setEditingSlide(null)
    setTitleSize("extra-large")
    setTitleWeight("black")
    setTitleLeading("tight")
    setSubtitleSize("medium")
  }

  const handleOpenDialog = (slide?: HeroSlide) => {
    if (slide) {
      setEditingSlide(slide)
      setFormData({
        title: slide.title,
        subtitle: slide.subtitle || "",
        button_text: slide.button_text,
        bg_color: slide.bg_color,
        layout: slide.layout,
        title_class: slide.title_class,
        subtitle_class: slide.subtitle_class,
        display_order: slide.display_order,
        is_active: slide.is_active,
      })
      setStats(slide.stats || [])
      setImageFile(null)

      // Parse existing classes to set user-friendly options
      // Try to detect size, weight, and leading from existing classes
      if (slide.title_class.includes("text-9xl") || slide.title_class.includes("text-8xl")) {
        setTitleSize("extra-large")
      } else if (slide.title_class.includes("text-7xl") || slide.title_class.includes("text-6xl")) {
        setTitleSize("large")
      } else if (slide.title_class.includes("text-5xl") || slide.title_class.includes("text-4xl")) {
        setTitleSize("medium")
      } else {
        setTitleSize("small")
      }

      if (slide.title_class.includes("font-black")) {
        setTitleWeight("black")
      } else if (slide.title_class.includes("font-bold")) {
        setTitleWeight("bold")
      } else {
        setTitleWeight("semibold")
      }

      if (slide.title_class.includes("leading-tight")) {
        setTitleLeading("tight")
      } else if (slide.title_class.includes("leading-normal")) {
        setTitleLeading("normal")
      } else if (slide.title_class.includes("leading-relaxed")) {
        setTitleLeading("relaxed")
      } else {
        setTitleLeading("none")
      }

      if (slide.subtitle_class.includes("text-xl") || slide.subtitle_class.includes("text-lg")) {
        setSubtitleSize("large")
      } else if (slide.subtitle_class.includes("text-base")) {
        setSubtitleSize("medium")
      } else {
        setSubtitleSize("small")
      }
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    resetForm()
  }

  const handleAddStat = () => {
    setStats([...stats, { value: "", label: "" }])
  }

  const handleRemoveStat = (index: number) => {
    setStats(stats.filter((_, i) => i !== index))
  }

  const handleStatChange = (index: number, field: "value" | "label", value: string) => {
    const newStats = [...stats]
    newStats[index] = { ...newStats[index], [field]: value }
    setStats(newStats)
  }

  const handleSubmit = async () => {
    try {
      if (!formData.title) {
        toast({
          title: "Error",
          description: "Title is required",
          variant: "destructive",
        })
        return
      }

      const slideData: CreateHeroSlideDTO = {
        title: formData.title!,
        subtitle: formData.subtitle,
        button_text: formData.button_text,
        bg_color: formData.bg_color,
        layout: formData.layout,
        title_class: formData.title_class,
        subtitle_class: formData.subtitle_class,
        stats: stats.filter((s) => s.value && s.label),
        display_order: formData.display_order,
        is_active: formData.is_active,
        image: imageFile || undefined,
      }

      if (editingSlide) {
        await updateMutation.mutateAsync({
          id: editingSlide.id,
          ...slideData,
        })
        toast({
          title: "Success",
          description: "Hero slide updated successfully!",
        })
      } else {
        await createMutation.mutateAsync(slideData)
        toast({
          title: "Success",
          description: "Hero slide created successfully!",
        })
      }

      handleCloseDialog()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to save hero slide",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this hero slide?")) return

    try {
      await deleteMutation.mutateAsync(id)
      toast({
        title: "Success",
        description: "Hero slide deleted successfully!",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete hero slide",
        variant: "destructive",
      })
    }
  }

  const handleToggleActive = async (slide: HeroSlide) => {
    try {
      await updateMutation.mutateAsync({
        id: slide.id,
        is_active: !slide.is_active,
      })
      toast({
        title: "Success",
        description: `Slide ${slide.is_active ? "deactivated" : "activated"} successfully!`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to update slide",
        variant: "destructive",
      })
    }
  }

  const handleMoveOrder = async (slide: HeroSlide, direction: "up" | "down") => {
    const currentIndex = slides?.findIndex((s) => s.id === slide.id) ?? -1
    if (currentIndex === -1) return

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= (slides?.length || 0)) return

    const targetSlide = slides?.[newIndex]
    if (!targetSlide) return

    try {
      // Swap display orders
      await Promise.all([
        updateMutation.mutateAsync({
          id: slide.id,
          display_order: targetSlide.display_order,
        }),
        updateMutation.mutateAsync({
          id: targetSlide.id,
          display_order: slide.display_order,
        }),
      ])
      toast({
        title: "Success",
        description: "Slide order updated successfully!",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to update slide order",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
        <div className="h-96 rounded-2xl bg-white border border-slate-200/90 shadow-2xs animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <ImageIcon className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hero Slides</h1>
          </div>
          <p className="text-sm text-slate-500">Manage, style, and reorder storefront carousel banners and CTA buttons.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Hero Slide
            </Button>
          </DialogTrigger>
              <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 overflow-hidden flex flex-col bg-white">
                <DialogHeader className="p-4">
                  <DialogTitle>{editingSlide ? "Edit Hero Slide" : "Create New Hero Slide"}</DialogTitle>
                  <DialogDescription>
                    Configure the slide content, image, and styling. See live preview on the right.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-hidden h-full">
                  <div className="flex w-full h-full">
                    {/* Preview Section */}
                    <div className="flex-1 lg:sticky lg:top-0 h-full overflow-hidden p-4 bg-gray-50/50">
                      <div className="rounded-lg h-full flex flex-col gap-4 overflow-hidden">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            <Label className="text-base font-semibold">Live Preview</Label>
                          </div>

                          <div className="flex items-center gap-2">
                            <Tabs
                              value={previewMode}
                              onValueChange={(v) => setPreviewMode(v as any)}
                              className="w-auto"
                            >
                              <TabsList className="grid w-full grid-cols-2 h-8">
                                <TabsTrigger value="desktop" className="px-3">
                                  <Monitor className="h-4 w-4" />
                                </TabsTrigger>
                                <TabsTrigger value="mobile" className="px-3">
                                  <Smartphone className="h-4 w-4" />
                                </TabsTrigger>
                              </TabsList>
                            </Tabs>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 bg-transparent"
                              onClick={() => setIsFullscreenPreviewOpen(true)}
                              title="Fullscreen Preview"
                            >
                              <Maximize2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div
                          className={`flex-1 overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-white relative transition-all duration-300 ${previewMode === "mobile" ? "flex justify-center items-center p-4 bg-gray-100" : ""
                            }`}
                        >
                          {previewMode === "mobile" ? (
                            <div className="relative w-[375px] h-[667px] bg-black rounded-[3rem] shadow-xl overflow-hidden border-[8px] border-gray-900 ring-1 ring-gray-900/5">
                              {/* Notch */}
                              <div className="absolute top-0 inset-x-0 h-6 bg-gray-900 rounded-b-3xl z-50 w-32 mx-auto"></div>
                              {/* Screen Content */}
                              <div className="w-full h-full overflow-y-auto bg-white">
                                <HeroSlidePreview
                                  title={formData.title || "Your Title"}
                                  subtitle={formData.subtitle || "Your subtitle text will appear here"}
                                  buttonText={formData.button_text || "Shop Now"}
                                  image={
                                    imageFile
                                      ? URL.createObjectURL(imageFile)
                                      : editingSlide?.image_url || "/placeholder.svg?height=600&width=1200"
                                  }
                                  bgColor={formData.bg_color || "bg-slate-950"}
                                  layout={formData.layout || "clean-left"}
                                  titleClass={formData.title_class || ""}
                                  subtitleClass={formData.subtitle_class || ""}
                                  stats={stats.filter((s) => s.value && s.label)}
                                />
                              </div>
                            </div>
                          ) : (
                            <div
                              className="w-full h-full relative overflow-hidden bg-gray-900 flex items-center justify-center p-4"
                              ref={setContainerEl}
                            >
                              <div
                                className="origin-center shadow-2xl transition-transform duration-200 ease-out bg-white"
                                style={{
                                  width: "1920px",
                                  height: "1080px",
                                  transform: `scale(${scale})`,
                                  // Optional: if scale is small, we might want to center differently, but origin-center works for flex center
                                }}
                              >
                                <HeroSlidePreview
                                  title={formData.title || "Your Title"}
                                  subtitle={formData.subtitle || "Your subtitle text will appear here"}
                                  buttonText={formData.button_text || "Shop Now"}
                                  image={
                                    imageFile
                                      ? URL.createObjectURL(imageFile)
                                      : editingSlide?.image_url || "/placeholder.svg?height=1080&width=1920"
                                  }
                                  bgColor={formData.bg_color || "bg-slate-950"}
                                  layout={formData.layout || "clean-left"}
                                  titleClass={formData.title_class || ""}
                                  subtitleClass={formData.subtitle_class || ""}
                                  stats={stats.filter((s) => s.value && s.label)}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Form Section */}
                    <div className="w-[20%] border-l bg-white h-full flex flex-col overflow-hidden">
                      {/* Presets Section - Scrollable */}
                      <div className="p-4 border-b space-y-3 flex-none max-h-[40%] overflow-y-auto pr-2 hover:pr-4 transition-all [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-primary/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-primary">
                        <div className="flex items-center justify-between sticky top-0 bg-white z-10 py-1">
                          <Label className="text-base font-semibold">Presets</Label>
                          <p className="text-[10px] text-muted-foreground">Apply ready-made hero layouts</p>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {HERO_PRESETS.map((preset) => (
                            <button
                              key={preset.key}
                              type="button"
                              onClick={() => applyPreset(preset)}
                              className="group border rounded-lg p-2 text-left hover:border-primary transition-colors bg-white shadow-sm"
                            >
                              <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <div className="text-xs font-semibold">{preset.name}</div>
                                  <div className="text-[10px] text-muted-foreground line-clamp-1">
                                    {preset.description}
                                  </div>
                                </div>
                                <div
                                  className="w-6 h-6 rounded-md border shrink-0"
                                  style={{
                                    backgroundColor:
                                      BG_COLOR_OPTIONS.find((c) => c.value === preset.bg_color)?.color || "#0f172a",
                                  }}
                                />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Inputs Section - Scrollable */}
                      <div className="p-4 flex-1 overflow-y-auto space-y-6 pr-2 hover:pr-4 transition-all [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-primary/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-primary">
                        <div className="space-y-4">
                          <Label className="text-base font-semibold sticky top-0 bg-white z-10 py-1 block">
                            Settings
                          </Label>
                          <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                              id="title"
                              value={formData.title}
                              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                              placeholder="FIND YOUR\nSTYLE"
                              className="h-8 text-sm"
                            />
                            <p className="text-[10px] text-gray-500">Use \n for line breaks</p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="button_text">Button Text</Label>
                            <Input
                              id="button_text"
                              value={formData.button_text}
                              onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                              placeholder="Shop Now"
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="subtitle">Subtitle</Label>
                          <Textarea
                            id="subtitle"
                            value={formData.subtitle}
                            onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                            placeholder="Discover meticulously crafted garments..."
                            rows={3}
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="layout">Layout</Label>
                            <Select
                              value={formData.layout}
                              onValueChange={(value: any) => setFormData({ ...formData, layout: value })}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {LAYOUT_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="bg_color">Background Color</Label>
                            <Select
                              value={formData.bg_color}
                              onValueChange={(value) => setFormData({ ...formData, bg_color: value })}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {BG_COLOR_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-3 h-3 rounded border border-gray-300"
                                        style={{ backgroundColor: opt.color }}
                                      />
                                      {opt.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="image">Image *</Label>
                          {editingSlide?.image_url && !imageFile && (
                            <img
                              src={editingSlide.image_url || "/placeholder.svg"}
                              alt="Current"
                              className="w-full h-48 object-cover mb-2 border rounded"
                            />
                          )}
                          {imageFile && (
                            <img
                              src={URL.createObjectURL(imageFile) || "/placeholder.svg"}
                              alt="Preview"
                              className="w-full h-48 object-cover mb-2 border rounded"
                            />
                          )}
                          <Input
                            id="image"
                            type="file"
                            accept="image/*"
                            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                          />
                        </div>

                        {/* Title Styling Options */}
                        <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
                          <Label className="text-base font-semibold">Title Styling</Label>
                          <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="title_size">Title Size</Label>
                              <Select value={titleSize} onValueChange={setTitleSize}>
                                <SelectTrigger id="title_size">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TITLE_SIZE_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="title_weight">Title Weight</Label>
                              <Select value={titleWeight} onValueChange={setTitleWeight}>
                                <SelectTrigger id="title_weight">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TITLE_WEIGHT_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="title_leading">Title Line Height</Label>
                              <Select value={titleLeading} onValueChange={setTitleLeading}>
                                <SelectTrigger id="title_leading">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TITLE_LEADING_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        {/* Subtitle Styling Options */}
                        <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
                          <Label className="text-base font-semibold">Subtitle Styling</Label>
                          <div className="space-y-2">
                            <Label htmlFor="subtitle_size">Subtitle Size</Label>
                            <Select value={subtitleSize} onValueChange={setSubtitleSize}>
                              <SelectTrigger id="subtitle_size">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SUBTITLE_SIZE_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Stats</Label>
                            <Button type="button" variant="outline" size="sm" onClick={handleAddStat}>
                              <Plus className="h-4 w-4 mr-1" />
                              Add Stat
                            </Button>
                          </div>
                          {stats.map((stat, index) => (
                            <div key={index} className="flex gap-2">
                              <Input
                                placeholder="Value (e.g., 200+)"
                                value={stat.value}
                                onChange={(e) => handleStatChange(index, "value", e.target.value)}
                              />
                              <Input
                                placeholder="Label (e.g., Brands)"
                                value={stat.label}
                                onChange={(e) => handleStatChange(index, "label", e.target.value)}
                              />
                              <Button type="button" variant="outline" size="sm" onClick={() => handleRemoveStat(index)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="display_order">Display Order</Label>
                            <Input
                              id="display_order"
                              type="number"
                              value={formData.display_order}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  display_order: Number.parseInt(e.target.value) || 0,
                                })
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="flex items-center justify-between pt-2">
                            <Label htmlFor="is_active">Active Status</Label>
                            <Switch
                              id="is_active"
                              checked={formData.is_active}
                              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t">
                          <Button variant="outline" onClick={handleCloseDialog}>
                            Cancel
                          </Button>
                          <Button onClick={handleSubmit}>
                            <Save className="mr-2 h-4 w-4" />
                            {editingSlide ? "Update" : "Create"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-5">
            <CardTitle className="text-base font-semibold text-slate-900">Hero Carousel Slides</CardTitle>
            <CardDescription className="text-xs text-slate-500">Manage all storefront banner slides. Use arrows to reorder or click edit to modify content.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {slides && slides.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70 border-b border-slate-100">
                    <TableHead className="font-semibold text-slate-700">Order</TableHead>
                    <TableHead className="font-semibold text-slate-700">Preview</TableHead>
                    <TableHead className="font-semibold text-slate-700">Title</TableHead>
                    <TableHead className="font-semibold text-slate-700">Layout</TableHead>
                    <TableHead className="font-semibold text-slate-700">Status</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slides.map((slide, index) => (
                    <TableRow key={slide.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveOrder(slide, "up")}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <span className="text-center">{slide.display_order}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveOrder(slide, "down")}
                            disabled={index === slides.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {slide.image_url ? (
                          <img
                            src={slide.image_url || "/placeholder.svg"}
                            alt={slide.title}
                            className="w-20 h-20 object-cover rounded"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{slide.title}</div>
                          {slide.subtitle && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">{slide.subtitle}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {LAYOUT_OPTIONS.find((o) => o.value === slide.layout)?.label || slide.layout}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Switch checked={slide.is_active} onCheckedChange={() => handleToggleActive(slide)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenDialog(slide)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(slide.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No hero slides yet</p>
                <Button className="mt-4" onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Slide
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Fullscreen Preview Modal */}
      <Dialog open={isFullscreenPreviewOpen} onOpenChange={setIsFullscreenPreviewOpen}>
        <DialogContent className="max-w-[100vw] h-[100vh] p-0 border-0 rounded-none bg-black">
          <div className="relative w-full h-full">
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-4 right-4 z-50 rounded-full shadow-lg bg-white/20 hover:bg-white/40 text-white border-none"
              onClick={() => setIsFullscreenPreviewOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
            <div
              className={`w-full h-full overflow-y-auto ${previewMode === "mobile" ? "flex justify-center items-center bg-gray-900" : ""}`}
            >
              {previewMode === "mobile" ? (
                <div className="relative w-[375px] h-[667px] bg-black rounded-[3rem] shadow-xl overflow-hidden border-[8px] border-gray-800 ring-1 ring-gray-700/50 scale-125">
                  {/* Notch */}
                  <div className="absolute top-0 inset-x-0 h-6 bg-gray-800 rounded-b-3xl z-50 w-32 mx-auto"></div>
                  {/* Screen Content */}
                  <div className="w-full h-full overflow-y-auto bg-white">
                    <HeroSlidePreview
                      title={formData.title || "Your Title"}
                      subtitle={formData.subtitle || "Your subtitle text will appear here"}
                      buttonText={formData.button_text || "Shop Now"}
                      image={
                        imageFile
                          ? URL.createObjectURL(imageFile)
                          : editingSlide?.image_url || "/placeholder.svg?height=1080&width=1920"
                      }
                      bgColor={formData.bg_color || "bg-slate-950"}
                      layout={formData.layout || "clean-left"}
                      titleClass={formData.title_class || ""}
                      subtitleClass={formData.subtitle_class || ""}
                      stats={stats.filter((s) => s.value && s.label)}
                    />
                  </div>
                </div>
              ) : (
                <HeroSlidePreview
                  title={formData.title || "Your Title"}
                  subtitle={formData.subtitle || "Your subtitle text will appear here"}
                  buttonText={formData.button_text || "Shop Now"}
                  image={
                    imageFile
                      ? URL.createObjectURL(imageFile)
                      : editingSlide?.image_url || "/placeholder.svg?height=1080&width=1920"
                  }
                  bgColor={formData.bg_color || "bg-slate-950"}
                  layout={formData.layout || "clean-left"}
                  titleClass={formData.title_class || ""}
                  subtitleClass={formData.subtitle_class || ""}
                  stats={stats.filter((s) => s.value && s.label)}
                />
              )}
            </div>

            {/* Control Bar for Fullscreen */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md rounded-full px-6 py-3 flex gap-4 z-50">
              <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as any)} className="w-auto">
                <TabsList className="bg-white/10 text-white">
                  <TabsTrigger
                    value="desktop"
                    className="px-4 data-[state=active]:bg-white data-[state=active]:text-black"
                  >
                    <Monitor className="h-4 w-4 mr-2" /> Desktop
                  </TabsTrigger>
                  <TabsTrigger
                    value="mobile"
                    className="px-4 data-[state=active]:bg-white data-[state=active]:text-black"
                  >
                    <Smartphone className="h-4 w-4 mr-2" /> Mobile
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
