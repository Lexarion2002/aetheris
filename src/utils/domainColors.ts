import type { DomainColor } from '../types'

interface ColorConfig {
  bg: string
  bgMuted: string
  text: string
  border: string
  dot: string
}

export const DOMAIN_COLORS: Record<DomainColor, ColorConfig> = {
  red:    { bg: 'bg-red-500/15',    bgMuted: 'bg-red-500/8',    text: 'text-red-400',    border: 'border-red-500/30',    dot: 'bg-red-400' },
  orange: { bg: 'bg-orange-500/15', bgMuted: 'bg-orange-500/8', text: 'text-orange-400', border: 'border-orange-500/30', dot: 'bg-orange-400' },
  yellow: { bg: 'bg-yellow-500/15', bgMuted: 'bg-yellow-500/8', text: 'text-yellow-400', border: 'border-yellow-500/30', dot: 'bg-yellow-400' },
  green:  { bg: 'bg-green-500/15',  bgMuted: 'bg-green-500/8',  text: 'text-green-400',  border: 'border-green-500/30',  dot: 'bg-green-400' },
  teal:   { bg: 'bg-teal-500/15',   bgMuted: 'bg-teal-500/8',   text: 'text-teal-400',   border: 'border-teal-500/30',   dot: 'bg-teal-400' },
  blue:   { bg: 'bg-blue-500/15',   bgMuted: 'bg-blue-500/8',   text: 'text-blue-400',   border: 'border-blue-500/30',   dot: 'bg-blue-400' },
  indigo: { bg: 'bg-indigo-500/15', bgMuted: 'bg-indigo-500/8', text: 'text-indigo-400', border: 'border-indigo-500/30', dot: 'bg-indigo-400' },
  purple: { bg: 'bg-purple-500/15', bgMuted: 'bg-purple-500/8', text: 'text-purple-400', border: 'border-purple-500/30', dot: 'bg-purple-400' },
  pink:   { bg: 'bg-pink-500/15',   bgMuted: 'bg-pink-500/8',   text: 'text-pink-400',   border: 'border-pink-500/30',   dot: 'bg-pink-400' },
  gray:   { bg: 'bg-zinc-500/15',   bgMuted: 'bg-zinc-500/8',   text: 'text-zinc-400',   border: 'border-zinc-500/30',   dot: 'bg-zinc-400' },
}

export const getDomainColors = (color: DomainColor) => DOMAIN_COLORS[color]
