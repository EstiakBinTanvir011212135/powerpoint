import React, { useState, useEffect, useRef } from "react";
import { Slide, SlideElement, Collaborator, ThemeType, TransitionType, Presentation } from "./types";
import { SlideCanvas } from "./components/SlideCanvas";
import { CreateDeckModal } from "./components/CreateDeckModal";
import { PRESENTATION_THEMES } from "./themes";
import { exportPresentationToPDF, initiateMP4VideoBuilder } from "./utils/exportUtils";
import {
  Sparkles,
  Layers,
  FileVideo,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Users,
  Copy,
  Layout,
  Music,
  User,
  Wand2,
  RefreshCw,
  Eye,
  Settings,
  Image as ImageIcon,
  CheckCircle,
  Clock,
  Send,
  ArrowUp,
  ArrowDown,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Generate a randomized user identity block for room sync
const RANDOM_USER_ID = `user_${Math.floor(Math.random() * 10000)}`;
const RANDOM_COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];
const USER_COLOR = RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)];
const USER_NAMES = ["Alex (Growth)", "Jordan (Ops)", "Taylor (Design)", "Jamie (Fin)", "Morgan (Tech)"];
const USER_NAME = USER_NAMES[Math.floor(Math.random() * USER_NAMES.length)];
const USER_AVATAR = USER_NAME.split(" ")[0].substring(0, 2);

export default function App() {
  // Room and collaboration state
  const [roomId, setRoomId] = useState<string>("tech-innovation-demo");
  const [isCloudSynced, setIsCloudSynced] = useState(true);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [activeTeammatesSimulation, setActiveTeammatesSimulation] = useState(true);
  const [teamAudienceCount, setTeamAudienceCount] = useState(3);

  // Presentation State
  const [presentationName, setPresentationName] = useState("Strategic Tech Innovation 2026");
  const [theme, setTheme] = useState<ThemeType>("glass_slate");
  const [transition, setTransition] = useState<TransitionType>("perspective-rotate");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);

  // UI state managers
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isEditLocked, setIsEditLocked] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGeneratingDeck, setIsGeneratingDeck] = useState(false);

  // AI elements suggestions state
  const [imageSearchPrompt, setImageSearchPrompt] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [suggestedImagesHistory, setSuggestedImagesHistory] = useState<string[]>([
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400&q=80"
  ]);

  // Activity feed logging
  const [logs, setLogs] = useState<Array<{ id: string; msg: string; timestamp: string }>>([
    { id: "log_1", msg: "Room joined. Real-time collaboration initialized.", timestamp: "Active" }
  ]);

  // Export Progress overlays
  const [exportPDFProgress, setExportPDFProgress] = useState<number | null>(null);
  const [exportMP4Progress, setExportMP4Progress] = useState<number | null>(null);
  const [exportMP4Phase, setExportMP4Phase] = useState<string>("");

  // Target canvas reference
  const activeSlide = slides[activeSlideIdx];

  // Load URL room IDs if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get("roomId");
    if (roomParam) {
      setRoomId(roomParam);
    }
  }, []);

  // Fetch / Sync existing slides database from server
  const fetchSessionData = async (targetRoomId: string) => {
    try {
      const response = await fetch(`/api/session/${targetRoomId}`);
      if (response.ok) {
        const data = await response.json();
        setPresentationName(data.name || "Untitled Presentation");
        setTheme(data.theme || "glass_slate");
        setTransition(data.transition || "carousel");
        if (data.slides && data.slides.length > 0) {
          setSlides(data.slides);
        }
        if (data.collaborators) {
          setCollaborators(data.collaborators);
        }
      }
    } catch (e) {
      console.error("Cloud fetch failed, remaining in local mode.", e);
    }
  };

  // Push slides and updates to cloud state
  const pushSessionUpdates = async (currentSlides: Slide[], currentTheme: ThemeType, currentTransition: TransitionType, currentName: string) => {
    try {
      setIsCloudSynced(false);
      await fetch(`/api/session/${roomId}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slides: currentSlides,
          theme: currentTheme,
          transition: currentTransition,
          name: currentName
        })
      });
      setIsCloudSynced(true);
    } catch (e) {
      console.error("Session sync failed:", e);
    }
  };

  // Initial Fetch & Regular 3s Poll for Real-time Updates (Multi-window sync!)
  useEffect(() => {
    fetchSessionData(roomId);
  }, [roomId]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchSessionData(roomId);
    }, 4000);
    return () => clearInterval(interval);
  }, [roomId]);

  // Send cursor coordinate updates to backend for visual mouse feedback
  const sendCursorPosition = async (x: number, y: number) => {
    try {
      if (!slides[activeSlideIdx]) return;
      await fetch(`/api/session/${roomId}/cursor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: RANDOM_USER_ID,
          userName: USER_NAME,
          avatar: USER_AVATAR,
          color: USER_COLOR,
          activeSlideId: slides[activeSlideIdx].id,
          x,
          y
        })
      });
    } catch (e) {
      // Slitently handle sync errors
    }
  };

  // Capture canvas mouse activities to stream cursors
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const canvasDoc = document.getElementById("presentation-canvas-frame");
    if (!canvasDoc) return;
    const rect = canvasDoc.getBoundingClientRect();
    const xPercent = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const yPercent = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    if (xPercent >= 0 && xPercent <= 100 && yPercent >= 0 && yPercent <= 100) {
      sendCursorPosition(xPercent, yPercent);
    }
  };

  // Active Team Members Simulation Hook (Simulates live teammates changing items & moving cursors)
  useEffect(() => {
    if (!activeTeammatesSimulation) return;

    const interval = setInterval(() => {
      setCollaborators((prev) => {
        const dummyMembers = [
          { id: "collab_1", name: "Sarah (Product Designer)", avatar: "SD", color: "#10B981", activeSlideId: slides[activeSlideIdx]?.id || "slide_1", x: 40 + Math.floor(Math.random() * 20), y: 30 + Math.floor(Math.random() * 20) },
          { id: "collab_2", name: "Michael (Marketing)", avatar: "MK", color: "#3B82F6", activeSlideId: slides[activeSlideIdx - 1]?.id || slides[activeSlideIdx]?.id, x: 20 + Math.floor(Math.random() * 40), y: 50 + Math.floor(Math.random() * 30) },
          { id: "collab_3", name: "Clara (Data Analyst)", avatar: "CA", color: "#F59E0B", activeSlideId: slides[activeSlideIdx]?.id || "slide_1", x: 60 + Math.floor(Math.random() * 25), y: 15 + Math.floor(Math.random() * 40) }
        ];

        // Occassionally push a chat log activity
        if (Math.random() > 0.7) {
          const teamPranks = [
            "Sarah is drafting structure changes in column graphics...",
            "Michael adjusted the title subtitle spacing.",
            "Clara suggests integrating hydrogen metrics visuals.",
            "Sarah connected from Tokyo office hub.",
            "Michael uploaded design reference layouts."
          ];
          const mockMsg = teamPranks[Math.floor(Math.random() * teamPranks.length)];
          setLogs((prevLogs) => [
            { id: `log_${Date.now()}_sim_${Math.random().toString(36).substring(2, 7)}`, msg: mockMsg, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
            ...prevLogs.slice(0, 15)
          ]);
        }

        return dummyMembers;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [activeTeammatesSimulation, slides, activeSlideIdx]);

  // Handle generative AI PowerPoint deck trigger from Modal
  const handleGenerateDeck = async (prompt: string, selectedTheme: ThemeType, imageBase64: string | null) => {
    try {
      setIsGeneratingDeck(true);
      const res = await fetch("/api/generate-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          exampleImage: imageBase64,
          requestedTheme: selectedTheme
        })
      });

      if (!res.ok) {
        let errorMsg = "Unable to parse presentation generated by Gemini.";
        try {
          const errData = await res.json();
          if (errData && errData.error) {
            errorMsg = errData.error;
          }
        } catch (_) {}
        throw new Error(errorMsg);
      }

      const data = await res.json();
      if (data.presentation) {
        setPresentationName(data.presentation.name);
        setTheme(data.presentation.theme);
        setTransition(data.presentation.transition);
        setSlides(data.presentation.slides);
        setActiveSlideIdx(0);

        setLogs((prev) => [
          {
            id: `log_${Date.now()}_gen_${Math.random().toString(36).substring(2, 7)}`,
            msg: data.fallbackMode && data.error && (data.error.includes("PERMISSION_DENIED") || data.error.includes("denied access") || data.error.includes("403"))
              ? `⚠️ Gemini API 403 (Access Denied). Loaded premium slide template deck as a fallback. Configure your API key in Settings > Secrets to enable full Gemini AI!`
              : data.fallbackMode
              ? `✨ Presentation template loaded successfully! Put your Gemini key in Settings > Secrets to unlock AI.`
              : `✨ Supercharged deck generated with Gemini! ${data.presentation.slides.length} slides ready.`,
            timestamp: data.fallbackMode ? "Fallback" : "Just Now"
          },
          ...prev
        ]);
        setIsCreateModalOpen(false);

        // Instantly push this generated beauty to the sync server database
        pushSessionUpdates(data.presentation.slides, data.presentation.theme, data.presentation.transition, data.presentation.name);
      }
    } catch (e: any) {
      alert("AI Generation completed or fallback mode activated: " + e.message);
    } finally {
      setIsGeneratingDeck(false);
    }
  };

  // AI-Powered Image Suggestion handler
  const handleAIImageGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageSearchPrompt.trim()) return;

    try {
      setIsGeneratingImage(true);
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: imageSearchPrompt })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.imageUrl) {
          setSuggestedImagesHistory((prev) => [data.imageUrl, ...prev]);
          setImageSearchPrompt("");
          setLogs((prev) => [
            { id: `log_${Date.now()}_img_${Math.random().toString(36).substring(2, 7)}`, msg: `🎨 Suggested Image Generated successfully!`, timestamp: "New" },
            ...prev
          ]);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Replace active image element on current slide with the selected image
  const handleImageApply = (imgUrl: string) => {
    if (!activeSlide) return;

    const imgElIdx = activeSlide.elements.findIndex(el => el.type === "image");
    let updatedElements = [...activeSlide.elements];

    if (imgElIdx !== -1) {
      // Replace existing
      updatedElements[imgElIdx] = {
        ...updatedElements[imgElIdx],
        content: imgUrl
      };
    } else {
      // Append a fresh beautiful overlay image element
      updatedElements.push({
        id: `img_el_${Date.now()}`,
        type: "image",
        content: imgUrl,
        x: 60,
        y: 35,
        w: 32,
        h: 50,
        style: {
          fontSize: "normal",
          fontWeight: "normal",
          align: "center",
          color: "body",
          backgroundColor: "transparent"
        }
      });
    }

    handleUpdateSlideElements(updatedElements);
    setLogs((prev) => [
      { id: `log_${Date.now()}_apply_${Math.random().toString(36).substring(2, 7)}`, msg: `Applied picture block to slide layout.`, timestamp: "Updated" },
      ...prev
    ]);
  };

  // Element coordinate modifications & sync triggers
  const handleUpdateSlideElements = (newElements: SlideElement[]) => {
    const updatedSlides = slides.map((slide, idx) => {
      if (idx === activeSlideIdx) {
        return { ...slide, elements: newElements };
      }
      return slide;
    });
    setSlides(updatedSlides);
    pushSessionUpdates(updatedSlides, theme, transition, presentationName);
  };

  const handleNotesChange = (notesText: string) => {
    const updatedSlides = slides.map((slide, idx) => {
      if (idx === activeSlideIdx) {
        return { ...slide, notes: notesText };
      }
      return slide;
    });
    setSlides(updatedSlides);
    pushSessionUpdates(updatedSlides, theme, transition, presentationName);
  };

  // Manual element additions (Headers, Bullet lists)
  const handleAddElement = (type: "title" | "subtitle" | "paragraph" | "bullet_list") => {
    if (!activeSlide) return;

    const defaultContentMap = {
      title: "New Sub-Header Banner",
      subtitle: "Innovative solution focus parameters.",
      paragraph: "Crafted elements are double-click editable. Hold and drag anywhere instantly on the wide 16:9 canvas preview.",
      bullet_list: ["Critical team milestone achieved", "Direct carbon footprint reduced by 50%", "Widescreen layouts sync in the cloud"]
    };

    const newEl: SlideElement = {
      id: `man_el_${Date.now()}`,
      type,
      content: defaultContentMap[type],
      x: 15,
      y: 45,
      w: type === "title" ? 70 : 50,
      h: type === "bullet_list" ? 40 : 15,
      style: {
        fontSize: type === "title" ? "2xl" : "normal",
        fontWeight: type === "title" ? "bold" : "normal",
        align: "left",
        color: type === "title" ? "heading" : "body",
        backgroundColor: "transparent"
      }
    };

    const updatedElements = [...activeSlide.elements, newEl];
    handleUpdateSlideElements(updatedElements);
    setSelectedElementId(newEl.id);
  };

  // New slide addition controls
  const handleAddSlide = () => {
    const newSlide: Slide = {
      id: `custom_slide_${Date.now()}`,
      title: `Slide ${slides.length + 1} Title`,
      notes: "Speaker comments regarding metric scaling and timeline strategies.",
      elements: [
        {
          id: `new_el_${Date.now()}`,
          type: "title",
          content: `New Layout slide ${slides.length + 1}`,
          x: 10,
          y: 35,
          w: 80,
          h: 18,
          style: { fontSize: "3xl", fontWeight: "bold", align: "center", color: "heading", backgroundColor: "transparent" }
        }
      ]
    };

    const newSlides = [...slides, newSlide];
    setSlides(newSlides);
    setActiveSlideIdx(newSlides.length - 1);
    pushSessionUpdates(newSlides, theme, transition, presentationName);
  };

  // Delete slide
  const handleDeleteSlide = (idx: number) => {
    if (slides.length <= 1) return;
    const filtered = slides.filter((_, sIdx) => sIdx !== idx);
    setSlides(filtered);
    setActiveSlideIdx(Math.max(0, idx - 1));
    pushSessionUpdates(filtered, theme, transition, presentationName);
  };

  // Reorder Slide Position Up/Down
  const handleMoveSlide = (idx: number, direction: "up" | "down") => {
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === slides.length - 1) return;

    const updated = [...slides];
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;

    setSlides(updated);
    setActiveSlideIdx(targetIdx);
    pushSessionUpdates(updated, theme, transition, presentationName);
  };

  // PDF Export trigger
  const triggerPDFExport = async () => {
    try {
      setExportPDFProgress(5);
      await exportPresentationToPDF(slides, theme, presentationName, setExportPDFProgress);
      setTimeout(() => setExportPDFProgress(null), 3000);
    } catch {
      setExportPDFProgress(null);
    }
  };

  // MP4 Export trigger
  const triggerMP4Export = async () => {
    try {
      setExportMP4Progress(5);
      await initiateMP4VideoBuilder(presentationName, slides.length, setExportMP4Phase, setExportMP4Progress);
      setTimeout(() => {
        setExportMP4Progress(null);
        setExportMP4Phase("");
      }, 4000);
    } catch {
      setExportMP4Progress(null);
    }
  };

  // URL copy helper
  const handleCopyLink = () => {
    const shareUrl = `${window.location.protocol}//${window.location.host}?roomId=${roomId}`;
    navigator.clipboard.writeText(shareUrl);
    setLogs((prev) => [
      { id: `log_${Date.now()}_copy_${Math.random().toString(36).substring(2, 7)}`, msg: "📋 Shareable collab room URL copied to clipboard!", timestamp: "Active" },
      ...prev
    ]);
  };

  return (
    <div className="min-h-screen sleek-bg text-[#e2e8f0] flex flex-col font-sans selection:bg-[#6366f1]/30 overflow-x-hidden antialiased">
      {/* HEADER DASHBOARD */}
      <header className="border-b border-white/10 bg-white/[0.02] backdrop-blur-xl px-4 py-3 sticky top-0 z-40 flex flex-col md:flex-row md:items-center justify-between gap-3 h-16">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-tr from-[#6366f1] to-[#a855f7] p-2.5 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.4)]">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-widest text-[#818cf8] uppercase bg-[#6366f1]/20 px-1.5 py-0.5 rounded border border-[#6366f1]/20">
                Studio Pro
              </span>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className={`w-1.5 h-1.5 rounded-full ${isCloudSynced ? "bg-emerald-500" : "bg-amber-400 animate-pulse"}`} />
                {isCloudSynced ? "Synced in real-time" : "Saving states..."}
              </div>
            </div>
            <input
              type="text"
              value={presentationName}
              onChange={(e) => {
                setPresentationName(e.target.value);
                pushSessionUpdates(slides, theme, transition, e.target.value);
              }}
              className="text-lg font-bold text-white bg-transparent border-b border-transparent hover:border-white/10 focus:border-[#6366f1] focus:outline-none py-0.5 max-w-[280px] md:max-w-md transition-colors"
            />
          </div>
        </div>

        {/* Dynamic Connected Room ID & URL Links */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Active collaborating cursors summary */}
          <div className="flex items-center gap-1.5 bg-white/[0.03] backdrop-blur-[12px] border border-white/10 px-2.5 py-1.5 rounded-xl">
            <Users className="w-3.5 h-3.5 text-[#818cf8]" />
            <span className="text-xs font-mono text-slate-300">Room: {roomId}</span>
            <button
              onClick={handleCopyLink}
              className="p-1 hover:bg-white/10 text-slate-400 hover:text-white rounded transition-colors ml-1.5"
              title="Copy session invite link"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>

          <div className="flex -space-x-1.5 overflow-hidden border border-white/10 rounded-full px-1.5 py-0.5 bg-[#05060f]">
            {collaborators.map((collab) => (
              <div
                key={collab.id}
                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-mono text-white font-black"
                style={{ backgroundColor: collab.color }}
                title={collab.name}
              >
                {collab.avatar}
              </div>
            ))}
            <div className="w-5 h-5 rounded-full bg-slate-800 border-2 border-[#05060f] flex items-center justify-center text-[8px] font-mono text-slate-400">
              +{teamAudienceCount}
            </div>
          </div>

          {/* Simulate collaboration toggle */}
          <button
            onClick={() => {
              setActiveTeammatesSimulation(!activeTeammatesSimulation);
              setLogs((prev) => [
                { id: `log_${Date.now()}_toggle_${Math.random().toString(36).substring(2, 7)}`, msg: activeTeammatesSimulation ? "Simulation paused." : "Simulation resumed.", timestamp: "Active" },
                ...prev
              ]);
            }}
            className={`text-xs px-3 py-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
              activeTeammatesSimulation
                ? "bg-[#6366f1]/10 border-[#6366f1]/30 text-[#818cf8] hover:bg-[#6366f1]/20"
                : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            {activeTeammatesSimulation ? "● Teammates Live" : "Teammates OFFLINE"}
          </button>

          {/* New deck launcher button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 bg-[#6366f1] hover:bg-[#5a5ebd] text-white text-xs font-bold py-2 px-3.5 rounded-xl shadow-lg shadow-[#6366f1]/30 cursor-pointer active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>AI Generator Suite</span>
          </button>
        </div>
      </header>

      {/* DASHBOARD WORKSPACE */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT BAR - Slides thumbnails order */}
        <aside className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-white/10 bg-white/[0.01] backdrop-blur-md p-3 flex flex-row lg:flex-col gap-3 lg:gap-4 overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto max-h-[35vh] lg:max-h-none">
          <div className="flex-1 flex flex-row lg:flex-col gap-2 min-w-max lg:min-w-0">
            <h3 className="hidden lg:block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 px-1.5">
              Deck Outline ({slides.length})
            </h3>

            {slides.length === 0 ? (
              <div className="text-center p-4 py-8 border border-dashed border-white/10 rounded-2xl w-full">
                <Layout className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
                <p className="text-xs text-slate-400">No slides loaded.</p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-3 text-[11px] bg-[#6366f1] hover:bg-[#5a5ebd] text-white font-mono rounded-lg px-3 py-1.5 shadow-md shadow-[#6366f1]/20 cursor-pointer"
                >
                  Generate First Deck
                </button>
              </div>
            ) : (
              slides.map((slide, idx) => {
                const isActive = activeSlideIdx === idx;
                return (
                  <div
                    key={slide.id}
                    onClick={() => {
                      setActiveSlideIdx(idx);
                      setSelectedElementId(null);
                    }}
                    className={`group relative flex flex-row items-center gap-2.5 p-2 rounded-xl border text-left cursor-pointer transition-all ${
                      isActive
                        ? "bg-[#6366f1]/10 border-[#6366f1] text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                        : "border-white/5 bg-white/[0.01] hover:bg-white/5 hover:border-white/20 text-slate-400 hover:text-slate-200"
                    } w-44 lg:w-full`}
                  >
                    {/* Index Bullet order */}
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center text-[10px] font-mono font-bold transition-colors ${
                      isActive ? "bg-[#6366f1]/20 border-[#6366f1]/30 text-[#818cf8]" : "bg-[#05060f] border-white/5 text-slate-500"
                    }`}>
                      {idx + 1}
                    </div>

                    {/* Miniature thumbnail slide details */}
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-bold truncate text-white">{slide.title || "Custom Slide"}</p>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {slide.elements.length} components
                      </p>
                    </div>

                    {/* Reorder and delete tools */}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveSlide(idx, "up");
                        }}
                        disabled={idx === 0}
                        className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded disabled:opacity-20"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveSlide(idx, "down");
                        }}
                        disabled={idx === slides.length - 1}
                        className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded disabled:opacity-20"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSlide(idx);
                        }}
                        disabled={slides.length <= 1}
                        className="p-1 text-red-400 hover:text-red-300 hover:bg-slate-800 rounded disabled:opacity-20"
                        title="Delete Slide"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-white/10 pt-2 hidden lg:block">
            <button
              onClick={handleAddSlide}
              className="w-full flex items-center justify-center gap-1.5 p-2 border border-dashed border-white/10 hover:border-[#6366f1]/55 bg-white/[0.01] hover:bg-white/[0.04] rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Slide</span>
            </button>
          </div>
        </aside>

        {/* PRIMARY CANVAS VIEW */}
        <main className="flex-1 p-4 lg:p-6 bg-transparent flex flex-col gap-4 overflow-y-auto">
          {/* Main Workspace Frame panel (Canvas and nav overlay) */}
          <div className="flex-1 flex flex-col items-center justify-center min-h-[45vh]">
            {activeSlide ? (
              <div
                className="w-full max-w-4xl relative"
                onMouseMove={handleCanvasMouseMove}
              >
                {/* Visual slide boundary navigator controls on overlay */}
                <div className="absolute top-1/2 -left-14 -translate-y-1/2 z-20 hidden md:block">
                  <button
                    onClick={() => {
                      setActiveSlideIdx(Math.max(0, activeSlideIdx - 1));
                      setSelectedElementId(null);
                    }}
                    disabled={activeSlideIdx === 0}
                    className="p-3 bg-[#05060f] border border-white/10 hover:border-[#6366f1]/40 hover:bg-white/[0.05] rounded-full text-slate-400 hover:text-white shadow-xl transition-all disabled:opacity-10 cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>

                <div className="absolute top-1/2 -right-14 -translate-y-1/2 z-20 hidden md:block">
                  <button
                    onClick={() => {
                      setActiveSlideIdx(Math.min(slides.length - 1, activeSlideIdx + 1));
                      setSelectedElementId(null);
                    }}
                    disabled={activeSlideIdx === slides.length - 1}
                    className="p-3 bg-[#05060f] border border-white/10 hover:border-[#6366f1]/40 hover:bg-white/[0.05] rounded-full text-slate-400 hover:text-white shadow-xl transition-all disabled:opacity-10 cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Main 16:9 widescreen canvas screen wrapper (stretches to fill boundaries cleanly) */}
                <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                  <SlideCanvas
                    slide={activeSlide}
                    themeType={theme}
                    transitionType={transition}
                    isEditLocked={isEditLocked}
                    selectedElementId={selectedElementId}
                    setSelectedElementId={setSelectedElementId}
                    onUpdateElements={handleUpdateSlideElements}
                    collaborators={collaborators}
                    activeUserId={RANDOM_USER_ID}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center p-8 bg-white/[0.02] sleek-glass rounded-3xl max-w-sm">
                <Layout className="w-8 h-8 text-[#818cf8] mx-auto mb-3 animate-pulse" />
                <p className="text-sm text-slate-300 font-bold">Launch your AI slide draft to begin</p>
                <p className="text-xs text-slate-500 mt-1">
                  Click 'AI Generator Suite' above to command Gemini to create templates.
                </p>
              </div>
            )}
          </div>

          {/* EDIT LOCKS & SPEAKER COMMENTS BOX */}
          {activeSlide && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Lock controller and keyboard guide info */}
              <div className="bg-white/[0.02] sleek-glass p-4 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                      Canvas Security Lock
                    </span>
                    <span className="text-[10px] font-mono text-[#818cf8]">Drag to Position</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Unlock elements to drag around slides, resize, delete, and double-click to edit content directly.
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => {
                      setIsEditLocked(!isEditLocked);
                      setSelectedElementId(null);
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      isEditLocked
                        ? "bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                        : "bg-[#6366f1]/10 border border-[#6366f1]/30 text-[#818cf8] hover:bg-[#6366f1]/20"
                    }`}
                  >
                    {isEditLocked ? (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Canvas Locked</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Canvas Unlocked</span>
                      </>
                    )}
                  </button>

                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Info className="w-3 h-3 text-slate-600" />
                    Use arrow keys to fine-tune
                  </div>
                </div>
              </div>

              {/* Speaker Notes element */}
              <div className="md:col-span-2 bg-white/[0.02] sleek-glass p-4 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                    Presenter / Speaker Notes
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">Auto Saved</span>
                </div>
                <textarea
                  value={activeSlide.notes || ""}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Enter notes, prompts or bullet talking points here..."
                  rows={2}
                  className="w-full bg-[#05060f]/60 border border-white/10 focus:border-[#6366f1] text-xs rounded-xl p-3 text-slate-300 placeholder-slate-600 focus:outline-none resize-none transition-colors"
                />
              </div>
            </div>
          )}
        </main>

        {/* RIGHT SIDEBAR - Strategic Controls & AI Assist */}
        <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-white/10 bg-white/[0.01] backdrop-blur-md p-4 flex flex-col gap-5 overflow-y-auto max-h-[85vh] lg:max-h-none">
          {/* Elements Addition Deck */}
          {activeSlide && (
            <div className="space-y-2.5">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                Manual Element Tools
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleAddElement("title")}
                  className="flex items-center gap-1.5 p-2 bg-white/[0.02] hover:bg-white/5 border border-white/10 hover:border-[#6366f1]/50 text-[11px] text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#818cf8]" />
                  <span>Sub-Header</span>
                </button>
                <button
                  onClick={() => handleAddElement("bullet_list")}
                  className="flex items-center gap-1.5 p-2 bg-white/[0.02] hover:bg-white/5 border border-white/10 hover:border-[#6366f1]/50 text-[11px] text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#818cf8]" />
                  <span>Bullet List</span>
                </button>
                <button
                  onClick={() => handleAddElement("subtitle")}
                  className="flex items-center gap-1.5 p-2 bg-white/[0.02] hover:bg-white/5 border border-white/10 hover:border-[#6366f1]/50 text-[11px] text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#818cf8]" />
                  <span>Simple Detail</span>
                </button>
                <button
                  onClick={() => handleAddElement("paragraph")}
                  className="flex items-center gap-1.5 p-2 bg-white/[0.02] hover:bg-white/5 border border-white/10 hover:border-[#6366f1]/50 text-[11px] text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#818cf8]" />
                  <span>Text Frame</span>
                </button>
              </div>
            </div>
          )}

          {/* Theme Settings & Transition Customs */}
          <div className="space-y-3 p-3.5 bg-white/[0.02] sleek-glass rounded-2xl">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
              Theme & Transition Controls
            </h3>

            <div className="space-y-2.5">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Slide Styling Palette</label>
                <select
                  value={theme}
                  onChange={(e) => {
                    const nextVal = e.target.value as ThemeType;
                    setTheme(nextVal);
                    pushSessionUpdates(slides, nextVal, transition, presentationName);
                  }}
                  className="w-full bg-slate-950 border border-white/5 focus:border-cyan-500 text-xs text-white rounded-xl p-2.5 outline-none cursor-pointer"
                >
                  {Object.values(PRESENTATION_THEMES).map((pTheme) => (
                    <option key={pTheme.key} value={pTheme.key}>
                      {pTheme.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Canvas Transition Effect</label>
                <select
                  value={transition}
                  onChange={(e) => {
                    const nextVal = e.target.value as TransitionType;
                    setTransition(nextVal);
                    pushSessionUpdates(slides, theme, nextVal, presentationName);
                  }}
                  className="w-full bg-[#05060f] border border-white/10 focus:border-[#6366f1] text-xs text-white rounded-xl p-2.5 outline-none cursor-pointer"
                >
                  <option value="perspective-rotate">Perspective 3D Rotate</option>
                  <option value="zoom-in">Spring Scale Bounce</option>
                  <option value="carousel">Vertic Carousel Roller</option>
                  <option value="slide-left">Widescreen Horizontal Slip</option>
                  <option value="fade">Frosted Cross Dissolve</option>
                </select>
              </div>
            </div>
          </div>

          {/* AI Image suggestions and real generative AI integrations block */}
          <div className="space-y-3 p-3.5 bg-white/[0.02] sleek-glass rounded-2xl">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[#818cf8]" />
              AI Image Suggestion Lab
            </h3>

            <form onSubmit={handleAIImageGeneration} className="relative flex gap-1.5">
              <input
                type="text"
                placeholder="e.g. quantum code wireframe art..."
                value={imageSearchPrompt}
                onChange={(e) => setImageSearchPrompt(e.target.value)}
                className="w-full bg-[#05060f] border border-white/10 focus:border-[#6366f1] text-xs text-white rounded-xl p-2.5 focus:outline-none placeholder-slate-600"
              />
              <button
                type="submit"
                disabled={isGeneratingImage || !imageSearchPrompt.trim()}
                className="bg-[#6366f1] hover:bg-[#5a5ebd] disabled:opacity-30 text-white p-2 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                title="Generate Image with AI"
              >
                {isGeneratingImage ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-white" />
                )}
              </button>
            </form>

            {/* Generated / suggested image results history grid of cards */}
            <div>
              <p className="text-[9px] text-slate-500 uppercase mb-2">Generated Slides Graphics (Click to Apply):</p>
              <div className="grid grid-cols-3 gap-1.5">
                {suggestedImagesHistory.map((imgSrc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleImageApply(imgSrc)}
                    className="relative group rounded-lg overflow-hidden border border-white/10 flex items-center justify-center aspect-square hover:border-[#6366f1] transition-colors cursor-pointer"
                  >
                    <img
                      src={imgSrc}
                      alt="AI Resource Item"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-[#6366f1]/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Plus className="w-4 h-4 text-white animate-bounce" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* EXPORTS MANAGER BLOCK */}
          <div className="space-y-3 p-3.5 bg-white/[0.02] sleek-glass rounded-2xl relative overflow-hidden">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
              Export Suite & Output formats
            </h3>

            {exportPDFProgress !== null ? (
              <div className="space-y-2 py-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#818cf8]">Compiling Vector PDF...</span>
                  <span>{exportPDFProgress}%</span>
                </div>
                <div className="w-full h-2 bg-[#05060f] rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-[#6366f1] transition-all duration-300"
                    style={{ width: `${exportPDFProgress}%` }}
                  />
                </div>
              </div>
            ) : exportMP4Progress !== null ? (
              <div className="space-y-2 py-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-fuchsia-400">Rendering high FP MP4...</span>
                  <span>{exportMP4Progress}%</span>
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-1">{exportMP4Phase}</p>
                <div className="w-full h-2 bg-[#05060f] rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-fuchsia-500 to-[#6366f1] transition-all duration-300"
                    style={{ width: `${exportMP4Progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={triggerPDFExport}
                  disabled={slides.length === 0}
                  className="w-full flex items-center justify-between p-3 bg-[#05060f] hover:bg-white/[0.04] border border-white/10 hover:border-[#6366f1]/45 text-xs font-bold text-slate-200 hover:text-white rounded-xl transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <FileDown className="w-4 h-4 text-[#818cf8]" />
                    <span>Compile Widescreen PDF</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 uppercase group-hover:text-[#818cf8]">
                    vector
                  </span>
                </button>

                <button
                  onClick={triggerMP4Export}
                  disabled={slides.length === 0}
                  className="w-full flex items-center justify-between p-3 bg-[#05060f] hover:bg-white/[0.04] border border-white/10 hover:border-fuchsia-500/45 text-xs font-bold text-slate-200 hover:text-white rounded-xl transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <FileVideo className="w-4 h-4 text-fuchsia-400 animate-pulse" />
                    <span>Compile Cinematic MP4</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 uppercase group-hover:text-fuchsia-400">
                    h.264
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Activity / System sync logs feeds (Pure architectural details of real time activities) */}
          <div className="flex-1 flex flex-col min-h-[160px] bg-slate-950/80 rounded-2xl border border-white/5 p-3 overflow-hidden">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 font-mono">
              COLLABORATION CHAT FEED
            </span>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 select-text">
              {logs.map((log) => (
                <div key={log.id} className="text-[11px] leading-normal font-mono text-slate-400">
                  <span className="text-slate-600 mr-1">[{log.timestamp}]</span>
                  <span>{log.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <CreateDeckModal
            onClose={() => setIsCreateModalOpen(false)}
            onGenerate={handleGenerateDeck}
            isGenerating={isGeneratingDeck}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
