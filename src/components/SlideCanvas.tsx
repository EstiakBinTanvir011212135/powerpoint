import React, { useState, useRef, useEffect } from "react";
import { Slide, SlideElement, Collaborator, ThemeType } from "../types";
import { PRESENTATION_THEMES } from "../themes";
import { Move, Maximize2, Trash2, Edit3, Image, List, MoveDown, CheckCircle2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SlideCanvasProps {
  slide: Slide;
  themeType: ThemeType;
  transitionType: string;
  isEditLocked: boolean;
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  onUpdateElements: (elements: SlideElement[]) => void;
  collaborators: Collaborator[];
  activeUserId: string;
}

export const SlideCanvas: React.FC<SlideCanvasProps> = ({
  slide,
  themeType,
  transitionType,
  isEditLocked,
  selectedElementId,
  setSelectedElementId,
  onUpdateElements,
  collaborators,
  activeUserId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = PRESENTATION_THEMES[themeType] || PRESENTATION_THEMES.glass_slate;

  // Dragging and resizing local state
  const dragStartRef = useRef<{ id: string; startX: number; startY: number; elX: number; elY: number } | null>(null);
  const resizeStartRef = useRef<{ id: string; startWidth: number; startHeight: number; elW: number; elH: number } | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeResizeId, setActiveResizeId] = useState<string | null>(null);

  // Keyboard controls for fine tuning elements
  useEffect(() => {
    if (isEditLocked || !selectedElementId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 5 : 1;
      const elIdx = slide.elements.findIndex(el => el.id === selectedElementId);
      if (elIdx === -1) return;

      const updated = [...slide.elements];
      const el = { ...updated[elIdx] };

      let changed = false;
      if (e.key === "ArrowUp") {
        el.y = Math.max(0, el.y - step);
        changed = true;
      } else if (e.key === "ArrowDown") {
        el.y = Math.min(100 - el.h, el.y + step);
        changed = true;
      } else if (e.key === "ArrowLeft") {
        el.x = Math.max(0, el.x - step);
        changed = true;
      } else if (e.key === "ArrowRight") {
        el.x = Math.min(100 - el.w, el.x + step);
        changed = true;
      }

      if (changed) {
        e.preventDefault();
        updated[elIdx] = el;
        onUpdateElements(updated);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElementId, slide.elements, isEditLocked]);

  // Handle Dragging elements
  const handleDragStart = (e: React.MouseEvent, el: SlideElement) => {
    if (isEditLocked) return;
    e.stopPropagation();
    setSelectedElementId(el.id);
    setActiveDragId(el.id);

    dragStartRef.current = {
      id: el.id,
      startX: e.clientX,
      startY: e.clientY,
      elX: el.x,
      elY: el.y,
    };
  };

  // Handle Resizing elements
  const handleResizeStart = (e: React.MouseEvent, el: SlideElement) => {
    if (isEditLocked) return;
    e.stopPropagation();
    setActiveResizeId(el.id);

    resizeStartRef.current = {
      id: el.id,
      startX: e.clientX,
      startY: e.clientY,
      elW: el.w,
      elH: el.h,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      // Handle element movement
      if (activeDragId && dragStartRef.current) {
        const info = dragStartRef.current;
        const dx = e.clientX - info.startX;
        const dy = e.clientY - info.startY;

        const percentDX = (dx / rect.width) * 100;
        const percentDY = (dy / rect.height) * 100;

        const updated = slide.elements.map((el) => {
          if (el.id === info.id) {
            return {
              ...el,
              x: Math.min(Math.max(0, Math.round(info.elX + percentDX)), 100 - el.w),
              y: Math.min(Math.max(0, Math.round(info.elY + percentDY)), 100 - el.h),
            };
          }
          return el;
        });
        onUpdateElements(updated);
      }

      // Handle element size resizing
      if (activeResizeId && resizeStartRef.current) {
        const info = resizeStartRef.current;
        const dx = e.clientX - info.startX;
        const dy = e.clientY - info.startY;

        const percentDX = (dx / rect.width) * 100;
        const percentDY = (dy / rect.height) * 100;

        const updated = slide.elements.map((el) => {
          if (el.id === info.id) {
            return {
              ...el,
              w: Math.min(Math.max(8, Math.round(info.elW + percentDX)), 100 - el.x),
              h: Math.min(Math.max(6, Math.round(info.elH + percentDY)), 100 - el.y),
            };
          }
          return el;
        });
        onUpdateElements(updated);
      }
    };

    const handleMouseUp = () => {
      setActiveDragId(null);
      setActiveResizeId(null);
      dragStartRef.current = null;
      resizeStartRef.current = null;
    };

    if (activeDragId || activeResizeId) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [activeDragId, activeResizeId, slide.elements]);

  // In-line Double Click text edits
  const [editingTextElementId, setEditingTextElementId] = useState<string | null>(null);

  const handleDoubleClick = (e: React.MouseEvent, el: SlideElement) => {
    if (isEditLocked) return;
    e.stopPropagation();
    setEditingTextElementId(el.id);
  };

  const handleTextChange = (id: string, newText: string) => {
    const updated = slide.elements.map((el) => {
      if (el.id === id) {
        return { ...el, content: newText };
      }
      return el;
    });
    onUpdateElements(updated);
  };

  const handleListChange = (id: string, index: number, lineText: string) => {
    const updated = slide.elements.map((el) => {
      if (el.id === id && Array.isArray(el.content)) {
        const newList = [...el.content];
        newList[index] = lineText;
        return { ...el, content: newList };
      }
      return el;
    });
    onUpdateElements(updated);
  };

  const deleteElement = (e: React.MouseEvent, elId: string) => {
    e.stopPropagation();
    const updated = slide.elements.filter((el) => el.id !== elId);
    onUpdateElements(updated);
    if (selectedElementId === elId) {
      setSelectedElementId(null);
    }
  };

  // Define transition animation settings
  const getTransitionVariants = () => {
    switch (transitionType) {
      case "slide-left":
        return {
          initial: { opacity: 0, x: 200, scale: 0.95 },
          animate: { opacity: 1, x: 0, scale: 1 },
          exit: { opacity: 0, x: -200, scale: 0.95 },
        };
      case "zoom-in":
        return {
          initial: { opacity: 0, scale: 0.7 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 1.2 },
        };
      case "perspective-rotate":
        return {
          initial: { opacity: 0, rotateY: 90, z: -100 },
          animate: { opacity: 1, rotateY: 0, z: 0 },
          exit: { opacity: 0, rotateY: -90, z: -100 },
        };
      case "carousel":
        return {
          initial: { opacity: 0, rotateX: 45, y: 150 },
          animate: { opacity: 1, rotateX: 0, y: 0 },
          exit: { opacity: 0, rotateX: -45, y: -150 },
        };
      case "fade":
      default:
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
        };
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative select-none">
      {/* Aspect ratio frame 16:9 */}
      <div
        id="presentation-canvas-frame"
        ref={containerRef}
        onClick={() => setSelectedElementId(null)}
        className={`w-full relative shadow-2xl transition-all duration-300 overflow-hidden border border-white/10 ${theme.bgClass}`}
        style={{ aspectRatio: "16/9" }}
      >
        {/* Background Ambient Glows for premium themes */}
        {themeType === "royal_emerald" && (
          <div className="absolute inset-0 pointer-events-none opacity-40 overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-12 -left-12 w-[500px] h-[500px] bg-emerald-700/10 rounded-full blur-3xl animate-pulse" />
          </div>
        )}
        {themeType === "glass_slate" && (
          <div className="absolute inset-0 pointer-events-none opacity-50 overflow-hidden">
            <div className="absolute -top-12 -right-12 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            variants={getTransitionVariants()}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: "spring", damping: 18, stiffness: 90 }}
            className="w-full h-full absolute top-0 left-0"
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Speaker Note Bubble (Visual and elegant indicator) */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 text-[10px] text-white/60">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Presenter Mode Active
            </div>

            {/* Title / Header Bar */}
            <div className="absolute top-4 left-6 z-10 font-mono tracking-widest uppercase opacity-40 text-[10px]">
              {slide.title || "Slide Details"}
            </div>

            {/* Elements */}
            {slide.elements.map((el) => {
              const isSelected = selectedElementId === el.id;
              const isEditing = editingTextElementId === el.id;

              return (
                <div
                  key={el.id}
                  style={{
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    width: `${el.w}%`,
                    height: `${el.h}%`,
                    zIndex: isSelected ? 30 : 10,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedElementId(el.id);
                  }}
                  onDoubleClick={(e) => handleDoubleClick(e, el)}
                  className={`absolute transition-shadow group ${
                    !isEditLocked ? "cursor-grab active:cursor-grabbing" : ""
                  } ${
                    isSelected && !isEditLocked
                      ? `ring-2 ring-cyan-500/80 ring-offset-2 ring-offset-transparent ${theme.borderGlow}`
                      : ""
                  } ${
                    isEditLocked
                      ? ""
                      : "hover:border hover:border-white/20 hover:bg-white/5 rounded-lg"
                  }`}
                  onMouseDown={(e) => handleDragStart(e, el)}
                >
                  {/* Action overlays for Dragging */}
                  {isSelected && !isEditLocked && (
                    <div className="absolute -top-10 left-0 flex items-center gap-1.5 bg-slate-900 border border-slate-700 p-1 rounded-lg shadow-xl z-50 text-xs">
                      <div className="p-1 text-slate-400 bg-slate-800 rounded">
                        <Move className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                      <span className="text-white/80 font-mono px-1">
                        X:{el.x}% Y:{el.y}%
                      </span>
                      <button
                        onClick={(e) => deleteElement(e, el.id)}
                        className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                        title="Delete element"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* ELEMENT RENDERING */}
                  <div className="w-full h-full flex flex-col overflow-hidden p-2 rounded-lg">
                    {el.type === "title" && (
                      <div className="w-full h-full flex items-center">
                        {isEditing && !isEditLocked ? (
                          <textarea
                            value={String(el.content)}
                            onChange={(e) => handleTextChange(el.id, e.target.value)}
                            onBlur={() => setEditingTextElementId(null)}
                            autoFocus
                            className="w-full h-full bg-slate-900/90 text-white rounded p-1 text-lg font-bold font-sans border border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 resize-none"
                          />
                        ) : (
                          <h1
                            className={`w-full block leading-tight ${theme.textHeading} ${
                              el.style.fontSize === "4xl" ? "text-4xl text-inherit" : "text-2xl"
                            } ${
                              el.style.align === "center"
                                ? "text-center"
                                : el.style.align === "right"
                                ? "text-right"
                                : "text-left"
                            }`}
                          >
                            {String(el.content)}
                          </h1>
                        )}
                      </div>
                    )}

                    {el.type === "subtitle" && (
                      <div className="w-full h-full flex items-center">
                        {isEditing && !isEditLocked ? (
                          <textarea
                            value={String(el.content)}
                            onChange={(e) => handleTextChange(el.id, e.target.value)}
                            onBlur={() => setEditingTextElementId(null)}
                            autoFocus
                            className="w-full h-full bg-slate-900/90 text-white rounded p-1 text-base border border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 resize-none"
                          />
                        ) : (
                          <p
                            className={`w-full block font-medium ${theme.textAccent} ${
                              el.style.align === "center"
                                ? "text-center"
                                : el.style.align === "right"
                                ? "text-right"
                                : "text-left"
                            }`}
                          >
                            {String(el.content)}
                          </p>
                        )}
                      </div>
                    )}

                    {el.type === "paragraph" && (
                      <div className="w-full h-full flex items-start overflow-y-auto pr-1">
                        {isEditing && !isEditLocked ? (
                          <textarea
                            value={String(el.content)}
                            onChange={(e) => handleTextChange(el.id, e.target.value)}
                            onBlur={() => setEditingTextElementId(null)}
                            autoFocus
                            className="w-full h-full bg-slate-900/90 text-white rounded p-1 text-sm border border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 resize-none"
                          />
                        ) : (
                          <p
                            className={`w-full leading-relaxed ${theme.textBody} text-sm ${
                              el.style.align === "center"
                                ? "text-center"
                                : el.style.align === "right"
                                ? "text-right"
                                : "text-left"
                            }`}
                          >
                            {String(el.content)}
                          </p>
                        )}
                      </div>
                    )}

                    {el.type === "bullet_list" && (
                      <div className="w-full h-full overflow-y-auto flex flex-col gap-2 pr-1">
                        {Array.isArray(el.content) ? (
                          el.content.map((bullet, bulletIdx) => (
                            <div key={bulletIdx} className="flex items-start gap-2.5">
                              <span className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                              {isEditing && !isEditLocked ? (
                                <input
                                  value={bullet}
                                  onChange={(e) => handleListChange(el.id, bulletIdx, e.target.value)}
                                  onBlur={() => setEditingTextElementId(null)}
                                  className="w-full bg-slate-900/90 text-white rounded px-1.5 py-0.5 text-xs font-sans border border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                                />
                              ) : (
                                <p className={`text-xs ${theme.textBody} flex-1`}>{bullet}</p>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className={`text-xs ${theme.textBody}`}>{String(el.content)}</p>
                        )}
                      </div>
                    )}

                    {el.type === "image" && (
                      <div className="w-full h-full relative group/img overflow-hidden rounded-xl bg-slate-900/40 border border-white/5 flex items-center justify-center">
                        <img
                          src={String(el.content)}
                          alt="AI Suggested Resource"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover rounded-xl shadow-lg transition-transform duration-500 group-hover/img:scale-105"
                        />
                        {/* Overlay to hint at image options */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center gap-2 transition-opacity duration-300 pointer-events-none">
                          <Image className="w-5 h-5 text-white animate-bounce" />
                          <span className="text-white text-[10px] uppercase font-mono tracking-widest">
                            AI suggested photo
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Resize handle (Bottom Right) */}
                  {isSelected && !isEditLocked && (
                    <div
                      onMouseDown={(e) => handleResizeStart(e, el)}
                      className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-cyan-500 text-white flex items-center justify-center rounded-tl shadow-lg hover:bg-cyan-400 transition-colors"
                      title="Resize Element"
                    >
                      <Maximize2 className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Simulated / Real Collaborative Cursor Pointers overlay */}
            {collaborators
              .filter((collab) => collab.activeSlideId === slide.id && collab.id !== activeUserId)
              .map((collab) => {
                if (collab.x === undefined || collab.y === undefined) return null;

                return (
                  <div
                    key={collab.id}
                    className="absolute pointer-events-none transition-all duration-300 ease-out z-50 flex flex-col items-start"
                    style={{ left: `${collab.x}%`, top: `${collab.y}%` }}
                  >
                    {/* Retro Elegant Style Cursor */}
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      style={{ filter: "drop-shadow(0px 2px 3px rgba(0,0,0,0.5))" }}
                    >
                      <path d="M0 0V15L5 10L10 15L12 13L7 8L13 7L0 0Z" fill={collab.color} />
                    </svg>

                    {/* Cursor Member Tag Box */}
                    <div
                      className="mt-1 px-2 py-0.5 text-[8px] font-mono tracking-wider text-white font-semibold rounded shadow-md border"
                      style={{
                        backgroundColor: collab.color,
                        borderColor: "rgba(255,255,255,0.4)",
                      }}
                    >
                      {collab.name}
                    </div>
                  </div>
                );
              })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
