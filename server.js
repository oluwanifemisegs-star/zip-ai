require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "ZIP AI",
    message: "Your story. Your world. Your movie."
  });
});

app.post("/api/screenwrite", async (req, res) => {
  try {
    const {
      story,
      title,
      genre,
      style,
      duration,
      language
    } = req.body || {};

    if (typeof story !== "string" || story.trim().length < 10) {
      return res.status(400).json({
        error: "Please enter a story idea of at least 10 characters."
      });
    }

    if (story.length > 12000) {
      return res.status(400).json({
        error: "Your story is too long. Please keep it under 12,000 characters."
      });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({
        error: "The AI screenwriter is not configured yet. Check the server's private .env file."
      });
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          temperature: 0.8,
          max_tokens: 3500,
          messages: [
            {
              role: "system",
              content: `You are ZIP AI, a creative animated-movie screenwriter.
Turn the user's idea into an engaging screenplay plan.
Include:
1. A compelling movie title.
2. A short logline.
3. Main characters with names, personalities, and visual descriptions.
4. A beginning, middle, and ending.
5. Numbered scenes with location, visual action, and dialogue.
6. A satisfying conclusion.

Respect the requested genre, animation style, approximate movie length, and language.
Keep character appearances consistent throughout.
Return readable Markdown with clear headings.
Do not claim to generate actual video or images.`
            },
            {
              role: "user",
              content: `Movie title: ${String(title || "My Animated Adventure").slice(0, 100)}
Genre: ${String(genre || "Adventure").slice(0, 50)}
Animation style: ${String(style || "2D Cartoon").slice(0, 50)}
Movie length: ${String(duration || "Short film").slice(0, 50)}
Language: ${String(language || "English").slice(0, 50)}

Story idea or script:
${story.trim()}`
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API error:", response.status, data.error?.message || "Request failed");

      return res.status(502).json({
        error: response.status === 429
          ? "The AI service is busy or its usage limit has been reached. Try again later."
          : "The AI screenwriter could not complete your request. Check your API account and try again."
      });
    }

    const screenplay = data.choices?.[0]?.message?.content;

    if (!screenplay) {
      return res.status(502).json({
        error: "The AI returned an empty screenplay. Please try again."
      });
    }

    res.json({
      title: String(title || "My Animated Adventure").slice(0, 100),
      screenplay
    });

  } catch (error) {
    console.error("Screenwriter error:", error.message);

    res.status(500).json({
      error: "Something went wrong while creating your screenplay. Please try again."
    });
  }
});
// ZIP AI — Pollinations Image Generation
app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt } = req.body || {};

    if (typeof prompt !== "string" || prompt.trim().length < 3) {
      return res.status(400).json({
        error: "Please enter an image description."
      });
    }

    if (prompt.length > 2000) {
      return res.status(400).json({
        error: "Image description must be under 2000 characters."
      });
    }

    const apiKey = process.env.POLLINATIONS_API_KEY;

    if (!apiKey) {
      return res.status(503).json({
        error: "Pollinations API key is missing from the server configuration."
      });
    }

    const imageUrl =
      "https://gen.pollinations.ai/image/" +
      encodeURIComponent(prompt.trim()) +
      "?model=flux&width=1024&height=1024";

    const response = await fetch(imageUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      signal: AbortSignal.timeout(120000)
    });

    if (!response.ok) {
      console.error("Pollinations image request failed:", response.status);

      return res.status(502).json({
        error: response.status === 429
          ? "Image generation is busy or rate-limited. Please try again later."
          : "Pollinations could not generate the image. Check your API access and try again."
      });
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.startsWith("image/")) {
      return res.status(502).json({
        error: "Pollinations returned an unexpected response instead of an image."
      });
    }

    const image = Buffer.from(await response.arrayBuffer());

    res.set("Content-Type", contentType);
    res.set("Cache-Control", "no-store");
    res.send(image);

  } catch (error) {
    console.error("Image generation error:", error.message);

    res.status(502).json({
      error: error.name === "TimeoutError"
        ? "Image generation took too long. Please try again."
        : "Could not generate the image. Please try again."
    });
  }
});
// ZIP AI — AI MOVIE SCENE BUILDER
app.post("/api/scene-plan", async (req, res) => {
  try {
    const { screenplay, style, language } = req.body || {};

    if (typeof screenplay !== "string" || screenplay.trim().length < 20) {
      return res.status(400).json({
        error: "Please generate a screenplay first."
      });
    }

    if (screenplay.length > 12000) {
      return res.status(400).json({
        error: "The screenplay is too long. Please shorten it and try again."
      });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({
        error: "The AI scene builder is not configured."
      });
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          temperature: 0.5,
          max_tokens: 4500,
          messages: [
            {
              role: "system",
              content: `You are ZIP AI's movie scene planner.
Convert the supplied screenplay into 4 to 8 sequential scenes.
Return ONLY valid JSON, with no Markdown fences, using this structure:
{
  "movieTitle": "Title",
  "scenes": [
    {
      "number": 1,
      "title": "Scene title",
      "location": "Location and time",
      "visualDescription": "Describe the visible action",
      "dialogue": [
        {"character": "Character name", "line": "Spoken dialogue"}
      ],
      "imagePrompt": "Detailed image-generation prompt"
    }
  ]
}
Rules:
- Keep the scenes in story order.
- Preserve character names and story continuity.
- Include 1 to 3 dialogue lines per scene when appropriate.
- Make every imagePrompt detailed and suitable for an AI image generator.
- Keep character appearances, clothing, and animation style consistent.
- Do not claim these still images are finished videos.
- Use the requested language for dialogue.
- Return valid JSON only.`
            },
            {
              role: "user",
              content: `Animation style: ${String(style || "2D Cartoon").slice(0, 50)}
Language: ${String(language || "English").slice(0, 50)}

Screenplay:
${screenplay.trim()}`
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Scene planner API error:",
        response.status,
        data.error?.message || "Request failed"
      );

      return res.status(502).json({
        error: response.status === 429
          ? "The AI service is busy or its usage limit has been reached."
          : "The AI scene planner could not complete the request."
      });
    }

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(502).json({
        error: "The AI returned an empty scene plan."
      });
    }

    let plan;

    try {
      const cleaned = content
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();

      plan = JSON.parse(cleaned);
    } catch {
      return res.status(502).json({
        error: "The AI returned an invalid scene plan. Please try again."
      });
    }

    if (
      !plan ||
      !Array.isArray(plan.scenes) ||
      plan.scenes.length === 0
    ) {
      return res.status(502).json({
        error: "No scenes were returned. Please try again."
      });
    }

    plan.scenes = plan.scenes.slice(0, 8).map((scene, index) => ({
      number: index + 1,
      title: String(scene.title || `Scene ${index + 1}`).slice(0, 150),
      location: String(scene.location || "Unspecified location").slice(0, 300),
      visualDescription: String(
        scene.visualDescription || ""
      ).slice(0, 2000),
      dialogue: Array.isArray(scene.dialogue)
        ? scene.dialogue.slice(0, 5).map(line => ({
            character: String(line.character || "Character").slice(0, 100),
            line: String(line.line || "").slice(0, 500)
          }))
        : [],
      imagePrompt: String(scene.imagePrompt || "").slice(0, 1800)
    }));

    res.json({
      movieTitle: String(plan.movieTitle || "My Movie").slice(0, 150),
      scenes: plan.scenes
    });

  } catch (error) {
    console.error("Scene planner error:", error.message);

    res.status(500).json({
      error: "Something went wrong while building your scenes."
    });
  }
});
app.post("/api/voice", async (req, res) => {
  try {
    const { text, voice = "chioma_eng", speed = 1.0 } = req.body || {};

    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        error: "Please enter text to generate speech."
      });
    }

    if (text.length > 3000) {
      return res.status(400).json({
        error: "Please keep your text under 3,000 characters."
      });
    }

    const allowedVoices = [
      "chioma_eng",
      "james_pidgin",
      "folami"
    ];

    if (!allowedVoices.includes(voice)) {
      return res.status(400).json({
        error: "Please select a supported voice."
      });
    }

    const response = await fetch(
      "https://abena.mobobi.com/playground/api/v1/tts/synthesize/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: text.trim(),
          voice,
          speed: Math.min(1.5, Math.max(0.5, Number(speed) || 1))
        }),
        signal: AbortSignal.timeout(60000)
      }
    );

    if (!response.ok) {
      console.error("Voice API status:", response.status);

      return res.status(502).json({
        error: "Voice generation failed. Please try again later."
      });
    }

    const contentType = response.headers.get("content-type") || "";
    let audio;

    if (contentType.includes("application/json")) {
      const data = await response.json();

      if (data.status !== "success" || !data.audio_base64) {
        return res.status(502).json({
          error: "The voice service did not return audio."
        });
      }

      audio = Buffer.from(data.audio_base64, "base64");
    } else if (contentType.includes("audio")) {
      audio = Buffer.from(await response.arrayBuffer());
    } else {
      return res.status(502).json({
        error: "The voice service returned an unsupported format."
      });
    }

    if (!audio.length || audio.length > 15 * 1024 * 1024) {
      return res.status(502).json({
        error: "The generated audio is empty or too large."
      });
    }

    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Content-Disposition", 'inline; filename="zip-ai-voice.wav"');
    res.setHeader("Cache-Control", "no-store");

    return res.send(audio);

  } catch (error) {
    console.error("Voice generation error:", error.stack || error.message);

    return res.status(500).json({
      error: "Could not generate the voice. Please try again."
    });
  }
});
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🎬 ZIP AI running at http://localhost:${PORT}`);
});
