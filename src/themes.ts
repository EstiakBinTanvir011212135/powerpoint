export interface ThemeConfig {
  key: string;
  name: string;
  bgClass: string;
  cardClass: string;
  textHeading: string;
  textBody: string;
  textAccent: string;
  textMuted: string;
  fontSans: string;
  fontDisplay: string;
  accentBg: string;
  borderGlow: string;
}

export const PRESENTATION_THEMES: Record<string, ThemeConfig> = {
  glass_slate: {
    key: "glass_slate",
    name: "Sleek Interface",
    bgClass: "skeet-bg-custom bg-[#05060f] text-[#e2e8f0]",
    cardClass: "bg-white/[0.03] backdrop-blur-[12px] border border-white/10 shadow-lg shadow-black/30 rounded-2xl",
    textHeading: "text-white font-extrabold tracking-tight font-sans",
    textBody: "text-[#cbd5e1] font-normal font-sans leading-relaxed text-sm",
    textAccent: "text-[#818cf8] font-bold",
    textMuted: "text-slate-500 font-normal font-sans",
    fontSans: "font-sans",
    fontDisplay: "font-sans",
    accentBg: "bg-[#6366f1]/20 border-[#6366f1]/30 text-[#818cf8]",
    borderGlow: "shadow-[0_0_15px_rgba(99,102,241,0.4)]",
  },
  dark_cyberpunk: {
    key: "dark_cyberpunk",
    name: "Cyberpunk Glow",
    bgClass: "bg-zinc-950 text-emerald-400 relative overflow-hidden bg-[linear-gradient(rgba(18,18,18,0.85),rgba(18,18,18,0.85)),linear-gradient(0deg,rgba(255,0,128,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,128,0.15)_1px,transparent_1px)] bg-[size:30px_30px]",
    cardClass: "bg-black/80 border-2 border-fuchsia-500 shadow-[0_0_15px_rgba(240,46,170,0.3)] rounded-none",
    textHeading: "text-fuchsia-500 uppercase tracking-widest font-bold",
    textBody: "text-zinc-300 font-mono",
    textAccent: "text-emerald-400 font-mono",
    textMuted: "text-zinc-600 font-mono",
    fontSans: "font-mono",
    fontDisplay: "font-mono",
    accentBg: "bg-fuchsia-500/10 border-fuchsia-400/40 text-fuchsia-400",
    borderGlow: "shadow-[0_0_20px_rgba(240,46,170,0.4)]",
  },
  editorial_serif: {
    key: "editorial_serif",
    name: "Editorial Serif",
    bgClass: "bg-[#faf8f5] text-stone-900",
    cardClass: "bg-white border-2 border-stone-300 rounded-none shadow-sm shadow-stone-200/50",
    textHeading: "text-stone-900 font-serif font-black tracking-tight",
    textBody: "text-stone-700 font-sans tracking-tight leading-relaxed",
    textAccent: "text-[#aa7d33] font-serif italic",
    textMuted: "text-stone-400 font-sans",
    fontSans: "font-sans",
    fontDisplay: "font-serif",
    accentBg: "bg-stone-100 border-stone-300 text-stone-800",
    borderGlow: "shadow-none",
  },
  brutalist_chrome: {
    key: "brutalist_chrome",
    name: "Brutalist Chrome",
    bgClass: "bg-zinc-200 text-black p-4",
    cardClass: "bg-white border-4 border-black shadow-[6px_6px_0px_#000] rounded-none",
    textHeading: "text-black uppercase tracking-normal font-black",
    textBody: "text-zinc-900 font-sans font-medium",
    textAccent: "text-yellow-500 font-black",
    textMuted: "text-zinc-500 font-sans",
    fontSans: "font-sans",
    fontDisplay: "font-sans",
    accentBg: "bg-yellow-400 border-2 border-black text-black font-bold",
    borderGlow: "shadow-[4px_4px_0px_#000]",
  },
  royal_emerald: {
    key: "royal_emerald",
    name: "Royal Emerald",
    bgClass: "bg-gradient-to-br from-emerald-950 via-teal-980 to-stone-950 text-stone-100",
    cardClass: "bg-emerald-950/40 backdrop-blur-md border border-amber-500/30 rounded-3xl shadow-xl shadow-emerald-950/50",
    textHeading: "text-amber-400 font-serif font-bold tracking-tight",
    textBody: "text-stone-200 font-sans leading-relaxed",
    textAccent: "text-emerald-300 font-semibold",
    textMuted: "text-emerald-700/80 font-normal",
    fontSans: "font-sans",
    fontDisplay: "font-serif",
    accentBg: "bg-amber-400/10 border-amber-400/20 text-amber-300",
    borderGlow: "shadow-[0_0_20px_rgba(245,158,11,0.1)]",
  }
};
