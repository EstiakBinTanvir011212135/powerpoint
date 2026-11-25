import React, { useState, useRef } from "react";
import { ThemeType } from "../types";
import { PRESENTATION_THEMES } from "../themes";
import { Sparkles, Image, Upload, Wand2, X, ClipboardCheck, AlertCircle, RefreshCw, Layers } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CreateDeckModalProps {
  onClose: () => void;
  onGenerate: (prompt: string, theme: ThemeType, imageBase64: string | null) => Promise<void>;
  isGenerating: boolean;
}

const LAYOUT_PRESETS = [
  {
    name: "Executive Split Grid",
    description: "Clear numeric layout with illustrative text grid on side",
    tag: "grid-style",
    img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Asymmetric Visual Slate",
    description: "Huge eye-catching display title offset next to modern canvas illustration",
    tag: "asymmetric-style",
    img: "https://images.unsplash.com/photo-1542744094-3a31f103e35f?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Minimalist Statement",
    description: "Enlarged key quotes and short elegant focus summaries with background blur",
    tag: "minimalist-style",
    img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=80",
  }
];

export const CreateDeckModal: React.FC<CreateDeckModalProps> = ({
  onClose,
  onGenerate,
  isGenerating,
}) => {
  const [prompt, setPrompt] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>("glass_slate");
  const [imgBase64, setImgBase64] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Read uploaded images
  const processFile = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImgBase64(reader.result as string);
        setSelectedPresetIdx(null); // Clear preset selection if custom upload occurs
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const selectPreset = (idx: number) => {
    setSelectedPresetIdx(idx);
    setImgBase64(LAYOUT_PRESETS[idx].img);
  };

  const removeImage = () => {
    setImgBase64(null);
    setSelectedPresetIdx(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    onGenerate(prompt, selectedTheme, imgBase64);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-4xl bg-slate-900/90 border border-white/10 rounded-3xl p-6 md:p-8 max-h-[90vh] overflow-y-auto shadow-2xl relative"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white bg-slate-800/50 p-2 rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title Block */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-cyan-500/20 rounded-2xl border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">AI Slides Generation Studio</h2>
            <p className="text-xs text-slate-400">Generate high-fidelity animated slide decks in 60 seconds.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Detailed Prompt */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-200 block">
              Describe presentation topic, core thesis & structure
            </label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. A technology pitch deck for a clean-energy software startup called Matrix Energy, introducing key team, grid analytics dashboard, carbon-offset calculations, and next investment seed round of $5M."
                required
                rows={3}
                className="w-full bg-slate-950/80 border border-white/10 focus:border-cyan-500 rounded-2xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-y transition-colors"
              />
              <div className="absolute bottom-3 right-3 text-[10px] font-mono text-slate-500 uppercase">
                Gemini 3.5 Engine
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Real Life Layout Reference Image */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-200 block flex items-center gap-2">
                <Image className="w-4 h-4 text-cyan-400" />
                Structure Reference Image (Optional)
              </label>

              {/* Drag n Drop Container */}
              {!imgBase64 ? (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 ${
                    dragActive
                      ? "border-cyan-500 bg-cyan-500/10 text-white"
                      : "border-slate-700 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/60 text-slate-400"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        processFile(e.target.files[0]);
                      }
                    }}
                    accept="image/*"
                    className="hidden"
                  />
                  <Upload className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                  <p className="text-xs font-semibold text-slate-300">Drag & drop layout graphic or click to browse</p>
                  <p className="text-[10px] text-slate-500 mt-1">PNG, JPG up to 10MB</p>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-slate-950 aspect-[16/9] flex items-center justify-center">
                  <img
                    src={imgBase64}
                    alt="Layout reference"
                    referrerPolicy="no-referrer"
                    className="max-h-full object-contain"
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
                    <span className="text-[10px] font-mono text-cyan-300 uppercase">Reference Enabled</span>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="text-red-400 hover:text-red-300 focus:outline-none"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Preset layout grids if user lacks file uploads */}
              <div className="pt-2">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Or select a standard design inspiration layout:
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {LAYOUT_PRESETS.map((preset, idx) => {
                    const isSelected = selectedPresetIdx === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => selectPreset(idx)}
                        className={`group relative flex flex-col items-start bg-slate-950 border text-left p-2 rounded-xl overflow-hidden transition-all duration-300 ${
                          isSelected
                            ? "border-cyan-500 bg-cyan-500/5 ring-1 ring-cyan-500"
                            : "border-white/5 hover:border-slate-700 hover:bg-slate-950/80"
                        }`}
                      >
                        <img
                          src={preset.img}
                          alt={preset.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-12 object-cover rounded-md mb-1 pb-0.5 opacity-65 group-hover:opacity-100 transition-opacity"
                        />
                        <p className="text-[9px] font-bold text-white/95 line-clamp-1">{preset.name}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Transition Styles & Color Themes Selector */}
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-200 block flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Select Visual Style Theme
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {Object.values(PRESENTATION_THEMES).map((theme) => {
                    const isSelected = selectedTheme === theme.key;
                    return (
                      <button
                        key={theme.key}
                        type="button"
                        onClick={() => setSelectedTheme(theme.key as ThemeType)}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? "border-cyan-500 bg-cyan-500/5 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                            : "border-white/5 hover:border-slate-800 bg-slate-950/30 hover:bg-slate-950/60 text-slate-400"
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold text-white tracking-widest uppercase">{theme.name}</p>
                          <div className="flex gap-2.5 mt-1">
                            <span className="text-[10px] text-slate-400 font-mono">Fonts: {theme.fontDisplay}</span>
                          </div>
                        </div>

                        {/* Colors Swatches indicator preview */}
                        <div className="flex -space-x-1.5 overflow-hidden">
                          <span className="w-3.5 h-3.5 rounded-full border border-slate-900 bg-slate-900" />
                          <span className="w-3.5 h-3.5 rounded-full border border-slate-900 bg-black" />
                          {theme.key === "royal_emerald" && (
                            <>
                              <span className="w-3.5 h-3.5 rounded-full border border-slate-900 bg-emerald-700" />
                              <span className="w-3.5 h-3.5 rounded-full border border-slate-900 bg-amber-400" />
                            </>
                          )}
                          {theme.key === "glass_slate" && (
                            <>
                              <span className="w-3.5 h-3.5 rounded-full border border-slate-900 bg-slate-600" />
                              <span className="w-3.5 h-3.5 rounded-full border border-slate-900 bg-cyan-500" />
                            </>
                          )}
                          {theme.key === "dark_cyberpunk" && (
                            <>
                              <span className="w-3.5 h-3.5 rounded-full border border-slate-900 bg-fuchsia-500" />
                              <span className="w-3.5 h-3.5 rounded-full border border-slate-900 bg-emerald-400" />
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="pt-4 flex items-center justify-between border-t border-white/5 gap-4">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
              <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
              Fully responsive, editable standard layouts output.
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className={`flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-3.5 px-8 rounded-2xl shadow-lg relative ${
                isGenerating ? "opacity-70 cursor-not-allowed" : "cursor-pointer active:scale-95"
              } transition-all`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  Drafting with AI Slide Engine...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 text-white animate-bounce" />
                  Generate Deck
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
