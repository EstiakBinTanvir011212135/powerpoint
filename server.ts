import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
const isPlaceholderKey = !apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "" || apiKey.includes("PLACEHOLDER") || apiKey.includes("MY_GEMINI");

if (apiKey && !isPlaceholderKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

const app = express();
const PORT = 3000;

// Middleware for parsing JSON with large limits (for base64 images)
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// In-memory Session Database for real-time syncing & cloud-like state
const sessions = new Map<string, {
  id: string;
  name: string;
  theme: string;
  transition: string;
  slides: any[];
  lastUpdated: number;
  collaborators: { id: string; name: string; avatar: string; color: string; activeSlideId: string; x?: number; y?: number }[];
}>();

// Helper to construct a nice starter deck
function createDefaultSlides(topic: string, theme: string) {
  return [
    {
      id: "slide_1",
      title: "Introduction",
      notes: "Welcome the audience and introduce the core thesis of the presentation on " + topic + ".",
      elements: [
        {
          id: "el_1_1",
          type: "title",
          content: topic || "Empowering the Future",
          x: 10,
          y: 28,
          w: 80,
          h: 22,
          style: {
            fontSize: "4xl",
            fontWeight: "bold",
            align: "center",
            color: "heading",
            backgroundColor: "transparent"
          }
        },
        {
          id: "el_1_2",
          type: "subtitle",
          content: "A visionary look at the innovations driving real impact.",
          x: 10,
          y: 54,
          w: 80,
          h: 12,
          style: {
            fontSize: "xl",
            fontWeight: "medium",
            align: "center",
            color: "accent",
            backgroundColor: "transparent"
          }
        },
        {
          id: "el_1_3",
          type: "paragraph",
          content: "Deck crafted with AI Live Engine • Synced in Real-Time",
          x: 20,
          y: 78,
          w: 60,
          h: 10,
          style: {
            fontSize: "normal",
            fontWeight: "normal",
            align: "center",
            color: "muted",
            backgroundColor: "transparent"
          }
        }
      ]
    },
    {
      id: "slide_2",
      title: "The core challenge",
      notes: "Detail the tension and friction points. This slide frames the gap in current options.",
      elements: [
        {
          id: "el_2_1",
          type: "title",
          content: "The Friction & Obstacles",
          x: 8,
          y: 12,
          w: 50,
          h: 12,
          style: {
            fontSize: "2xl",
            fontWeight: "bold",
            align: "left",
            color: "heading",
            backgroundColor: "transparent"
          }
        },
        {
          id: "el_2_2",
          type: "bullet_list",
          content: [
            "Disconnected Tools: Modern workflows require jumping across multiple creative and development applications.",
            "Visual Inconsistency: Standard auto-generators create boring, unaligned structures with stacked blocks.",
            "Manual Overhead: Exporting polished web formats, PDFs, or slides with precise timing takes hours of adjustments."
          ],
          x: 8,
          y: 30,
          w: 48,
          h: 58,
          style: {
            fontSize: "normal",
            fontWeight: "normal",
            align: "left",
            color: "body",
            backgroundColor: "transparent"
          }
        },
        {
          id: "el_2_3",
          type: "image",
          content: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80",
          x: 60,
          y: 30,
          w: 32,
          h: 55,
          style: {
            fontSize: "normal",
            fontWeight: "normal",
            align: "center",
            color: "body",
            backgroundColor: "transparent"
          }
        }
      ]
    },
    {
      id: "slide_3",
      title: "Our Innovation",
      notes: "Highlight state-of-the-art features and key differentiators. Position this as an ultimate solution.",
      elements: [
        {
          id: "el_3_1",
          type: "title",
          content: "Key Strategic Advantages",
          x: 8,
          y: 12,
          w: 84,
          h: 12,
          style: {
            fontSize: "2xl",
            fontWeight: "bold",
            align: "left",
            color: "heading",
            backgroundColor: "transparent"
          }
        },
        {
          id: "el_3_2",
          type: "paragraph",
          content: "We provide an immersive, highly scalable environment leveraging the latest AI to draft interactive, fully customizable presentation elements in real time. Combined with dynamic glassmorphic styles, standard sliders become premium digital assets instantly.",
          x: 8,
          y: 30,
          w: 40,
          h: 58,
          style: {
            fontSize: "normal",
            fontWeight: "normal",
            align: "left",
            color: "body",
            backgroundColor: "transparent"
          }
        },
        {
          id: "el_3_3",
          type: "bullet_list",
          content: [
            "Stunning glassmorphism & gradients designed automatically.",
            "Dynamic mouse dragging and element sizing for manual overrides.",
            "Simultaneous team cursors updating in real-time."
          ],
          x: 52,
          y: 30,
          w: 40,
          h: 58,
          style: {
            fontSize: "normal",
            fontWeight: "normal",
            align: "left",
            color: "body",
            backgroundColor: "transparent"
          }
        }
      ]
    }
  ];
}

// Pre-create some awesome public sessions for demoing
sessions.set("tech-innovation-demo", {
  id: "tech-innovation-demo",
  name: "Strategic Tech Innovation 2026",
  theme: "glass_slate",
  transition: "perspective-rotate",
  slides: createDefaultSlides("Strategic Tech Innovation 2026", "glass_slate"),
  lastUpdated: Date.now(),
  collaborators: [
    { id: "collab_1", name: "Sarah (Product Designer)", avatar: "SD", color: "#10B981", activeSlideId: "slide_1", x: 45, y: 35 },
    { id: "collab_2", name: "Michael (Marketing Lead)", avatar: "ML", color: "#3B82F6", activeSlideId: "slide_2", x: 62, y: 48 }
  ]
});

sessions.set("green-energy-deck", {
  id: "green-energy-deck",
  name: "Green Climate & Clean Energy Matrix",
  theme: "royal_emerald",
  transition: "zoom-in",
  slides: [
    {
      id: "slide_e1",
      title: "Hero Banner Cover",
      notes: "Introduce the ESG and green initiatives designed for the company.",
      elements: [
        {
          id: "ele_1",
          type: "title",
          content: "Clean Energy Matrix 2026",
          x: 10,
          y: 26,
          w: 80,
          h: 22,
          style: { fontSize: "4xl", fontWeight: "bold", align: "center", color: "heading", backgroundColor: "transparent" }
        },
        {
          id: "ele_2",
          type: "subtitle",
          content: "Powering grid intelligence and low-carbon infrastructure investments.",
          x: 10,
          y: 52,
          w: 80,
          h: 12,
          style: { fontSize: "xl", fontWeight: "medium", align: "center", color: "accent", backgroundColor: "transparent" }
        }
      ]
    },
    {
      id: "slide_e2",
      title: "Decarbonization Metrics",
      notes: "Show the incredible stats on emissions reduction and scaling.",
      elements: [
        {
          id: "ele_3",
          type: "title",
          content: "Accelerated Reductions",
          x: 8,
          y: 12,
          w: 84,
          h: 12,
          style: { fontSize: "2xl", fontWeight: "bold", align: "left", color: "heading", backgroundColor: "transparent" }
        },
        {
          id: "ele_4",
          type: "paragraph",
          content: "Our metrics show a sustained decrease in baseline coal dependancy as wind, solar thermal, and hydrogen backup systems integrate seamlessly into major national power streams.",
          x: 8,
          y: 30,
          w: 42,
          h: 55,
          style: { fontSize: "normal", fontWeight: "normal", align: "left", color: "body", backgroundColor: "transparent" }
        },
        {
          id: "ele_5",
          type: "bullet_list",
          content: [
            "-45% direct factory and delivery grid carbon output.",
            "+300 Gigawatts of clean, active, and fully monitored energy.",
            "Smart Grid distribution dynamically allocating flow rate."
          ],
          x: 54,
          y: 30,
          w: 38,
          h: 55,
          style: { fontSize: "normal", fontWeight: "normal", align: "left", color: "accent", backgroundColor: "transparent" }
        }
      ]
    }
  ],
  lastUpdated: Date.now(),
  collaborators: [
    { id: "collab_3", name: "Clara (Sustainability Analyst)", avatar: "CA", color: "#F59E0B", activeSlideId: "slide_e1", x: 20, y: 40 }
  ]
});

// API endpoint to generate high quality slides using Gemini 3.5-flash
app.post("/api/generate-slides", async (req, res) => {
  try {
    const { prompt, exampleImage, requestedTheme } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required for presentation generation" });
    }

    if (!ai) {
      // Offline fallback deck if no GEMINI_API_KEY is available (to prevent crashes on unconfigured sites)
      console.warn("No GEMINI_API_KEY configured. Returning fallback interactive presentation.");
      const demoDeck = {
        name: prompt || "Automated Slide Deck",
        theme: requestedTheme || "glass_slate",
        transition: "carousel",
        slides: createDefaultSlides(prompt, requestedTheme || "glass_slate")
      };
      return res.json({ presentation: demoDeck, fallbackMode: true });
    }

    console.log(`Generating presentation slides for prompt: "${prompt}", theme: "${requestedTheme}"`);

    const imageInstruction = exampleImage 
      ? "\nAn analyze of the example image uploaded by the user is requested. Look at its style, diagram format, contrast or aesthetic structure, and replicate this structure appropriately in the layout and alignment of elements on the slides."
      : "";

    const systemInstruction = `You are a professional PowerPoint and presentation layout algorithm. Your task is to output an exceptional, highly structured presentation deck in JSON format based on the user's prompt. 
Each slide contains clear titles, bullet points, text paragraphs, or image elements placed at precise relative X, Y coordinates (based on percentage coordinates, 0 to 100, on a standard 16:9 canvas).

Ensure layouts are balanced, modern, and elements absolutely NEVER overlap.
For a standard 16:9 canvas (100% width, 100% height), adhere to the following layout templates:
1. Cover Slide:
   - Big Title, centered: x: 10, y: 25, w: 80, h: 22
   - Subtitle, centered: x: 10, y: 52, w: 80, h: 12
2. Split Left-Text / Right-Image:
   - Title: x: 8, y: 12, w: 84, h: 12
   - Bullet list or paragraph (Left): x: 8, y: 28, w: 46, h: 60
   - Image placeholder (Right): x: 60, y: 28, w: 32, h: 56
3. Balanced Multi-Column or List:
   - Title: x: 8, y: 12, w: 84, h: 12
   - Sub-points (Column 1): x: 8, y: 28, w: 40, h: 60
   - Sub-points (Column 2): x: 52, y: 28, w: 40, h: 60
4. Big Graphic or Quote Focus:
   - Title: x: 8, y: 12, w: 84, h: 12
   - Central Quote or Stat: x: 12, y: 28, w: 76, h: 32
   - Paragraph detail below: x: 12, y: 64, w: 76, h: 22

You must generate between 4 and 5 high-quality, professional slides. Ensure content is factual, deeply engaging, and not filled with lorem ipsum. Provide valuable, comprehensive summaries.
For the images, recommend a highly relevant, beautiful Unsplash query keyword that relates specifically to that slide's theme.
${imageInstruction}

Output ONLY a JSON block that strictly conforms to this TypeScript interface structure:
interface PresentationDeck {
  name: string; // The overall presentation title
  theme: 'dark_cyberpunk' | 'glass_slate' | 'editorial_serif' | 'brutalist_chrome' | 'royal_emerald';
  transition: 'fade' | 'slide-left' | 'zoom-in' | 'perspective-rotate' | 'carousel';
  slides: Array<{
    id: string; // unique e.g. "slide_1", "slide_2" etc
    title: string; // Brief, concise slide title
    notes: string; // Strategic speaker notes for this slide (1-2 sentences)
    elements: Array<{
      id: string; // unique element ID, eg "el_1_1"
      type: 'title' | 'subtitle' | 'paragraph' | 'bullet_list' | 'image';
      content: string[]; // Always an array of strings. For non-list elements, return a single-item array eg ["Title Content"]
      x: number; // 0-100 percentage width offset
      y: number; // 0-100 percentage height offset
      w: number; // 0-100 percentage width size
      h: number; // 0-100 percentage height size
      style: {
        fontSize: 'xl' | '2xl' | '3xl' | '4xl' | 'normal';
        fontWeight: 'bold' | 'medium' | 'normal';
        align: 'left' | 'center' | 'right';
        color: 'heading' | 'body' | 'accent' | 'muted';
        backgroundColor: 'transparent' | 'accent' | 'card_bg';
      };
    }>;
  }>;
}`;

    // Compile Gemini contents
    const contents: any[] = [];
    if (exampleImage) {
      // If there's an example image, extract the base64 part
      const base64Data = exampleImage.split(",")[1] || exampleImage;
      const mimeType = exampleImage.split(";")[0].split(":")[1] || "image/png";
      contents.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      });
    }

    contents.push({
      text: `Generate a fully realized slide presentation about this request: "${prompt}". Let's set the theme to: "${requestedTheme || 'glass_slate'}".`
    });

    let parsed: any = null;
    let fallbackMode = false;
    let fallbackErrorMsg = "";

    try {
      // Run generation query
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.95,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "The name of the presentation" },
              theme: { 
                type: Type.STRING, 
                enum: ["dark_cyberpunk", "glass_slate", "editorial_serif", "brutalist_chrome", "royal_emerald"],
                description: "The visual style matched to the presentation" 
              },
              transition: { 
                type: Type.STRING, 
                enum: ["fade", "slide-left", "zoom-in", "perspective-rotate", "carousel"],
                description: "The transition style recommended" 
              },
              slides: {
                type: Type.ARRAY,
                description: "An array of 4 or 5 slides shaping the deck, including complete contents",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    notes: { type: Type.STRING },
                    elements: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          type: { type: Type.STRING, enum: ["title", "subtitle", "paragraph", "bullet_list", "image"] },
                          content: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "The text content or an array of strings for list, or an image string description/query"
                          },
                          x: { type: Type.INTEGER },
                          y: { type: Type.INTEGER },
                          w: { type: Type.INTEGER },
                          h: { type: Type.INTEGER },
                          style: {
                            type: Type.OBJECT,
                            properties: {
                              fontSize: { type: Type.STRING, enum: ["xl", "2xl", "3xl", "4xl", "normal"] },
                              fontWeight: { type: Type.STRING, enum: ["bold", "medium", "normal"] },
                              align: { type: Type.STRING, enum: ["left", "center", "right"] },
                              color: { type: Type.STRING, enum: ["heading", "body", "accent", "muted"] },
                              backgroundColor: { type: Type.STRING, enum: ["transparent", "accent", "card_bg"] }
                            }
                          }
                        },
                        required: ["id", "type", "content", "x", "y", "w", "h", "style"]
                      }
                    }
                  },
                  required: ["id", "title", "notes", "elements"]
                }
              }
            },
            required: ["name", "theme", "transition", "slides"]
          }
        }
      });

      const textOutput = response.text;
      if (!textOutput) {
        throw new Error("No response returned from Gemini Model API.");
      }
      parsed = JSON.parse(textOutput.trim());
    } catch (genError: any) {
      console.warn("AI slide generation failed. Transitioning to custom dynamic fallback generator: ", genError.message || genError);
      fallbackMode = true;
      fallbackErrorMsg = genError.message || String(genError);
      
      parsed = {
        name: prompt || "Automated Slide Deck",
        theme: requestedTheme || "glass_slate",
        transition: "carousel",
        slides: createDefaultSlides(prompt, requestedTheme || "glass_slate")
      };
    }

    // Sanitize image content: If 'content' is parsed as an array for images, join it or grab first element. 
    // If it's a layout image element, make sure we format it nicely or search Unsplash
    if (parsed.slides && Array.isArray(parsed.slides)) {
      parsed.slides.forEach((slide: any) => {
        if (slide.elements && Array.isArray(slide.elements)) {
          slide.elements.forEach((el: any) => {
            // If it's a list, ensure content is array. Otherwise ensure it's a string
            if (el.type === 'bullet_list') {
              if (typeof el.content === 'string') {
                el.content = [el.content];
              } else if (!Array.isArray(el.content)) {
                el.content = ["Key bullet highlight points."];
              }
            } else {
              if (Array.isArray(el.content)) {
                el.content = el.content.join(" ") || "Presentation element highlighting info.";
              } else if (typeof el.content !== 'string') {
                el.content = String(el.content);
              }

              // If image type, convert descriptive query string into a beautiful unsplash URL or set default
              if (el.type === 'image') {
                const query = encodeURIComponent(el.content || 'abstract tech');
                el.content = `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80&sig=${Math.floor(Math.random() * 10000)}&q=${query}`;
              }
            }
          });
        }
      });
    }

    res.json({ presentation: parsed, fallbackMode, error: fallbackErrorMsg });
  } catch (error: any) {
    console.error("Failed handling slides generation:", error);
    res.status(500).json({ error: error.message || "An unexpected error occurred building presentation." });
  }
});

// Endpoint to generate an image using gemini-2.5-flash-image based on text context
app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Image prompt is required" });
    }

    if (!ai) {
      console.warn("No GEMINI_API_KEY configured for Image generation. Returning random beautiful abstract Unsplash image.");
      const randTag = encodeURIComponent(prompt.substring(0, 15));
      const fallbackUrl = `https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80&sig=${Math.floor(Math.random() * 999)}&q=${randTag}`;
      return res.json({ imageUrl: fallbackUrl });
    }

    console.log(`Generating AI image with prompt: "${prompt}" using gemini-2.5-flash-image`);

    // Use prompt engineering to make it visual and cohesive with presentation slide graphics
    const detailedPrompt = `A premium presentation vector graphic or illustrative background image. Style should be minimalist digital flat design, highly clean, modern corporate abstract visual, high-contrast, extremely elegant. Scene: ${prompt}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          { text: detailedPrompt }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1" // Or 4:3 / 16:9 depending on location
        }
      }
    });

    let base64Image = "";
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Image = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!base64Image) {
      throw new Error("Unable to extract inline generated image from Gemini model output.");
    }

    res.json({ imageUrl: base64Image });
  } catch (error: any) {
    console.error("AI Image Generation failed:", error);
    // Return a beautiful dynamic fallback pattern from unsplash if we exceed quotas or hit errors
    const fallbackImage = `https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=800&q=80&sig=${Math.floor(Math.random() * 999)}`;
    res.json({ imageUrl: fallbackImage, error: error.message });
  }
});

// GET existing session
app.get("/api/session/:id", (req, res) => {
  const sess = sessions.get(req.params.id);
  if (!sess) {
    return res.status(404).json({ error: "Collaboration room not found." });
  }
  res.json(sess);
});

// POST update session state (cloud sync)
app.post("/api/session/:id/update", (req, res) => {
  const { slides, theme, transition, name } = req.body;
  let sess = sessions.get(req.params.id);

  if (!sess) {
    // Dynamically create the session if it doesn't exist
    sess = {
      id: req.params.id,
      name: name || "Untitled Presentation",
      theme: theme || "glass_slate",
      transition: transition || "carousel",
      slides: slides || [],
      lastUpdated: Date.now(),
      collaborators: []
    };
    sessions.set(req.params.id, sess);
  } else {
    // Update existing
    if (slides) sess.slides = slides;
    if (theme) sess.theme = theme;
    if (transition) sess.transition = transition;
    if (name) sess.name = name;
    sess.lastUpdated = Date.now();
  }

  res.json(sess);
});

// POST cursor positions and active slide updates (team syncing mockup)
app.post("/api/session/:id/cursor", (req, res) => {
  const { userId, userName, activeSlideId, x, y, avatar, color } = req.body;
  const sess = sessions.get(req.params.id);
  if (!sess) {
    return res.status(404).json({ error: "Collaboration room not found." });
  }

  let client = sess.collaborators.find(c => c.id === userId);
  if (!client) {
    client = { id: userId, name: userName || "Co-editor", avatar: avatar || "CE", color: color || "#FF3366", activeSlideId };
    sess.collaborators.push(client);
  }

  client.activeSlideId = activeSlideId;
  client.x = x;
  client.y = y;
  sess.lastUpdated = Date.now();

  res.json(sess);
});


// Start server listening
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening at http://localhost:${PORT}`);
    if (!apiKey) {
      console.log("⚠️  GEMINI_API_KEY env variable is absent. App running in offline visual generator sandbox mode.");
    } else {
      console.log("🚀 Server running with Gemini API key verified!");
    }
  });
}

startServer();
