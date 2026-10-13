import type { LucideIcon } from "lucide-react"
import {
  ArrowDownLeft,
  ArrowLeftRight,
  Bell,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  LayoutGrid,
  Lock,
  LogOut,
  Download,
  House,
  Moon,
  Repeat,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Sun,
  Tag,
  Target,
  TrendingUp,
  TriangleAlert,
  Type,
  Wallet,
  Car,
} from "lucide-react"

export const DESIGN_ICONS = {
  house: House,
  arrows: ArrowLeftRight,
  trending: TrendingUp,
  target: Target,
  grid: LayoutGrid,
  eye: Eye,
  eyeoff: EyeOff,
  alert: TriangleAlert,
  sparkles: Sparkles,
  cart: ShoppingCart,
  car: Car,
  search: Search,
  bell: Bell,
  card: CreditCard,
  wallet: Wallet,
  income: ArrowDownLeft,
  repeat: Repeat,
  chevron: ChevronRight,
  tag: Tag,
  sliders: SlidersHorizontal,
  sun: Sun,
  moon: Moon,
  phone: Smartphone,
  lock: Lock,
  download: Download,
  back: ChevronLeft,
  logout: LogOut,
  textsize: Type,
} satisfies Record<string, LucideIcon>

export type DesignIconName = keyof typeof DESIGN_ICONS

export function DesignIcon({
  name,
  className,
  size = 20,
  strokeWidth = 2,
}: {
  name: DesignIconName
  className?: string
  size?: number
  strokeWidth?: number
}) {
  const Icon = DESIGN_ICONS[name]
  return <Icon className={className} size={size} strokeWidth={strokeWidth} />
}
