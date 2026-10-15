const storyInput = document.getElementById("story");
const count = document.getElementById("count");
const titleInput = document.getElementById("title");
const result = document.getElementById("result");
const resultContent = document.getElementById("result-content");
const resultSubtitle = document.getElementById("result-subtitle");
const generate = document.getElementById("generate");

let mode = "idea";

const storyIdeas = {
  Action: "A fearless young hero discovers a hidden power and must stop a dangerous enemy from destroying their city.",
  Adventure: "A curious teenager discovers an ancient map that leads to a forgotten kingdom filled with secrets and unexpected challenges.",
  Romance: "Two strangers from very different worlds meet by chance, discover an unexpected connection, and must overcome the obstacles keeping them apart.",
  Comedy: "A funny, unlucky young person accidentally becomes the hero of their neighbourhood after one ridiculous mistake turns into a wild adventure.",
  Fantasy: "A young dreamer discovers a magical world hidden inside an ordinary forest and must protect it from a mysterious darkness.",
  Mystery: "After strange events begin happening in a quiet town, a clever teenager follows hidden clues to uncover a secret nobody expected."
};

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

storyInput.addEventListener("input", () => {
  count.textContent = `${storyInput.value.length} / 12000`;
});

document.querySelectorAll(".choice").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".choice").forEach(item => item.classList.remove("selected"));
    button.classList.add("selected");
    mode = button.dataset.mode;
    storyInput.placeholder = mode === "idea"
      ? "Describe a simple idea for your movie..."
      : "Paste or write your full story here...";
  });
});

document.querySelectorAll(".template").forEach(button => {
  button.addEventListener("click", () => {
    const genre = button.dataset.template;
    if (!storyIdeas[genre]) return;

    storyInput.value = storyIdeas[genre];
    count.textContent = `${storyInput.value.length} / 12000`;

    const genreSelect = document.getElementById("genre");
    const option = [...genreSelect.options].find(item => item.textContent.trim() === genre);
    if (option) genreSelect.value = option.value;

    document.querySelectorAll(".template").forEach(item => item.classList.remove("template-selected"));
    button.classList.add("template-selected");
    storyInput.focus();
  });
});

generate.addEventListener("click", async () => {
  const story = storyInput.value.trim();

  if (story.length < 10) {
    alert("Please enter a little more about your movie first!");
    storyInput.focus();
    return;
  }

  const title = titleInput.value.trim() || "My Animated Adventure";
  const settings = {
    story,
    title,
    genre: document.getElementById("genre").value,
    style: document.getElementById("style").value,
    duration: document.getElementById("duration").value,
    language: document.getElementById("language").value
  };

  generate.disabled = true;
  generate.textContent = "✦ Writing your screenplay...";

  result.hidden = false;
  resultSubtitle.textContent = "ZIP AI is asking the screenwriter to develop your story.";
  resultContent.innerHTML = `
    <h3>🎬 Creating your screenplay</h3>
    <p>Please wait while ZIP AI contacts the AI screenwriter. This may take a little while.</p>
    <p>Keep this page open while your screenplay is being written.</p>
  `;
  result.scrollIntoView({ behavior: "smooth", block: "start" });

  try {
    const response = await fetch("/api/screenwrite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "The AI screenwriter could not complete your request.");
    }

    const screenplay = String(data.screenplay || "").trim();
    if (!screenplay) throw new Error("The AI returned an empty screenplay.");

    resultSubtitle.textContent = `${title} · ${settings.genre} · ${settings.style}`;

    const formatted = escapeHTML(screenplay)
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h3>$1</h3>")
      .replace(/^# (.+)$/gm, "<h2>$1</h2>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");

    resultContent.innerHTML = `
      <div class="movie-details">
        <p><strong>Genre:</strong> ${escapeHTML(settings.genre)}</p>
        <p><strong>Animation:</strong> ${escapeHTML(settings.style)}</p>
        <p><strong>Length:</strong> ${escapeHTML(settings.duration)}</p>
        <p><strong>Language:</strong> ${escapeHTML(settings.language)}</p>
      </div>
      <hr>
      <div class="screenplay-output">${formatted}</div>
      <p class="disclaimer">Screenplay generated by AI. Actual animated video has not yet been generated.</p>
    `;

  } catch (error) {
    resultSubtitle.textContent = "Screenplay generation needs attention.";
    resultContent.innerHTML = `
      <h3>We couldn't finish this screenplay.</h3>
      <p>${escapeHTML(error.message)}</p>
      <p>Check that the server is running, your API key is configured, and your AI account can make requests.</p>
    `;
  } finally {
    generate.disabled = false;
    generate.innerHTML = 'Build my movie plan <span>→</span>';
  }
});

// ========================================
// ZIP AI CHARACTER STUDIO
// ========================================

(() => {
  const form = document.getElementById("character-form");
  const preview = document.getElementById("character-preview");
  const saveButton = document.getElementById("save-character");
  const characterList = document.getElementById("character-list");

  if (!form || !preview || !saveButton || !characterList) return;

  let currentCharacter = null;
  const savedCharacters = [];

  function makeCharacterPrompt(character) {
    return [
      `Create a ${character.style} character design.`,
      `Name: ${character.name}.`,
      `Role: ${character.role}.`,
      character.age ? `Age: ${character.age}.` : "",
      `Physical appearance: ${character.appearance || "Design an appearance suitable for the character's role"}.`,
      `Personality: ${character.personality || "Expressive and memorable"}.`,
      "Show the complete character from head to toe.",
      "Use clear lighting, a readable silhouette, detailed clothing,",
      "a consistent art style, and a simple background.",
      "Character concept art for an animated movie."
    ].filter(Boolean).join(" ");
  }

  function readCharacterForm() {
    return {
      name: document.getElementById("character-name").value.trim(),
      role: document.getElementById("character-role").value,
      age: document.getElementById("character-age").value.trim(),
      appearance: document.getElementById("character-appearance").value.trim(),
      personality: document.getElementById("character-personality").value.trim(),
      style: document.getElementById("character-style").value
    };
  }

  function renderSavedCharacters() {
    if (!savedCharacters.length) {
      characterList.innerHTML = "<p>No characters saved yet.</p>";
      return;
    }

    characterList.innerHTML = savedCharacters.map((character, index) => `
      <article class="saved-character">
        ${character.portraitUrl
        ? `<img class="character-avatar" src="${escapeHTML(character.portraitUrl)}" alt="${escapeHTML(character.name)}" style="width:90px;height:90px;object-fit:cover;border-radius:12px;">`
        : '<div class="character-avatar">🎭</div>'}
        <div>
          <h4>${escapeHTML(character.name)}</h4>
          <p>${escapeHTML(character.role)} · ${escapeHTML(character.style)}</p>
          <button type="button" data-copy-character="${index}">
            View character
          </button>
        </div>
      </article>
    `).join("");
  }

  form.addEventListener("submit", event => {
    event.preventDefault();

    const character = readCharacterForm();

    if (!character.name) {
      alert("Please give your character a name.");
      return;
    }

    character.prompt = makeCharacterPrompt(character);
    currentCharacter = character;

    preview.innerHTML = `
      <div class="character-avatar">🎭</div>
      <h3>${escapeHTML(character.name)}</h3>
      <p><strong>Role:</strong> ${escapeHTML(character.role)}</p>
      <p><strong>Art style:</strong> ${escapeHTML(character.style)}</p>
      <p><strong>Appearance:</strong> ${escapeHTML(character.appearance || "Not specified")}</p>
      <p><strong>Personality:</strong> ${escapeHTML(character.personality || "Not specified")}</p>
      <label for="character-prompt-output">CHARACTER DESIGN PROMPT</label>
      <textarea id="character-prompt-output" rows="8" readonly></textarea>
      <button id="copy-character-prompt" class="primary-btn full" type="button">
        Copy character prompt
      </button>
      <button id="generate-character-portrait" class="primary-btn full" type="button">
        🎨 Generate Character Portrait
      </button>
      <p id="character-image-status" role="status" aria-live="polite"></p>
      ${character.portraitUrl
        ? `<img src="${escapeHTML(character.portraitUrl)}" alt="${escapeHTML(character.name)} portrait" style="display:block;width:100%;max-width:500px;margin:16px auto;border-radius:16px;">`
        : ""}
    `;

    document.getElementById("character-prompt-output").value = character.prompt;
    saveButton.disabled = false;

    document.getElementById("copy-character-prompt")
      .addEventListener("click", async () => {
        const text = character.prompt;

        try {
          await navigator.clipboard.writeText(text);
          alert("Character prompt copied!");
        } catch {
          const output = document.getElementById("character-prompt-output");
          output.focus();
          output.select();
          alert("Select the text and copy it manually.");
        }
      });
  });

  saveButton.addEventListener("click", () => {
    if (!currentCharacter) return;

    if (savedCharacters.some(character =>
      character.name.toLowerCase() === currentCharacter.name.toLowerCase()
    )) {
      alert("A character with this name is already saved.");
      return;
    }

    savedCharacters.push({ ...currentCharacter });
    renderSavedCharacters();

    alert(`${currentCharacter.name} saved to this session!`);
  });

  characterList.addEventListener("click", event => {
    const button = event.target.closest("[data-copy-character]");
    if (!button) return;

    const character = savedCharacters[Number(button.dataset.copyCharacter)];
    if (!character) return;

    currentCharacter = character;
    preview.innerHTML = `
      <div class="character-avatar">🎭</div>
      <h3>${escapeHTML(character.name)}</h3>
      <p><strong>Role:</strong> ${escapeHTML(character.role)}</p>
      <p><strong>Art style:</strong> ${escapeHTML(character.style)}</p>
      <label for="character-prompt-output">CHARACTER DESIGN PROMPT</label>
      <textarea id="character-prompt-output" rows="8" readonly></textarea>
      <button id="copy-character-prompt" class="primary-btn full" type="button">
        Copy character prompt
      </button>
      <button id="generate-character-portrait" class="primary-btn full" type="button">
        🎨 Generate Character Portrait
      </button>
      <p id="character-image-status" role="status" aria-live="polite"></p>
      ${character.portraitUrl
        ? `<img src="${escapeHTML(character.portraitUrl)}" alt="${escapeHTML(character.name)} portrait" style="display:block;width:100%;max-width:500px;margin:16px auto;border-radius:16px;">`
        : ""}
    `;

    document.getElementById("character-prompt-output").value = character.prompt;
    saveButton.disabled = true;

    document.getElementById("copy-character-prompt")
      .addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(character.prompt);
          alert("Character prompt copied!");
        } catch {
          const output = document.getElementById("character-prompt-output");
          output.focus();
          output.select();
          alert("Select the text and copy it manually.");
        }
      });
  });

  preview.addEventListener("click", async event => {
    const button = event.target.closest("#generate-character-portrait");
    if (!button || !currentCharacter) return;

    const character = currentCharacter;
    const status = document.getElementById("character-image-status");

    button.disabled = true;
    button.textContent = "Generating portrait...";
    if (status) status.textContent = "🎨 Creating your character portrait. Please wait...";

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: character.prompt })
      });

      if (!response.ok) {
        let message = "Could not generate the character portrait.";
        try {
          const data = await response.json();
          message = data.error || message;
        } catch (_) {}
        throw new Error(message);
      }

      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) {
        throw new Error("The server did not return a valid image.");
      }

      if (character.portraitUrl && character.portraitUrl.startsWith("blob:")) {
        URL.revokeObjectURL(character.portraitUrl);
      }

      character.portraitUrl = URL.createObjectURL(blob);

      if (status) status.textContent = "✅ Character portrait generated!";

      if (savedCharacters.some(item => item === character)) {
        renderSavedCharacters();
      }

      const promptOutput = document.getElementById("character-prompt-output");
      const existingPortrait = preview.querySelector("#character-generated-portrait");
      if (existingPortrait) existingPortrait.remove();

      const portrait = document.createElement("img");
      portrait.id = "character-generated-portrait";
      portrait.src = character.portraitUrl;
      portrait.alt = character.name + " portrait";
      portrait.style.cssText = "display:block;width:100%;max-width:500px;margin:16px auto;border-radius:16px;";

      if (promptOutput) {
        promptOutput.insertAdjacentElement("afterend", portrait);
      } else {
        preview.appendChild(portrait);
      }

    } catch (error) {
      if (status) status.textContent = "❌ " + error.message;
    } finally {
      button.disabled = false;
      button.textContent = "🎨 Generate Character Portrait";
    }
  });

  renderSavedCharacters();
})();

// ZIP AI — Pollinations Image Studio
(() => {
  const promptInput = document.getElementById("image-prompt");
  const generateButton = document.getElementById("generate-image");
  const status = document.getElementById("image-status");
  const result = document.getElementById("image-result");
  const image = document.getElementById("generated-image");
  const downloadButton = document.getElementById("download-image");

  if (
    !promptInput ||
    !generateButton ||
    !status ||
    !result ||
    !image ||
    !downloadButton
  ) {
    return;
  }

  let currentImageUrl = null;

  generateButton.addEventListener("click", async () => {
    const prompt = promptInput.value.trim();

    if (prompt.length < 3) {
      status.textContent = "Please describe the image you want.";
      return;
    }

    generateButton.disabled = true;
    generateButton.textContent = "Generating...";
    status.textContent = "🎨 Creating your image. This may take a little while.";
    result.hidden = true;

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        let message = "Image generation failed. Please try again.";

        try {
          const data = await response.json();
          message = data.error || message;
        } catch (_) {}

        throw new Error(message);
      }

      const blob = await response.blob();

      if (!blob.type.startsWith("image/")) {
        throw new Error("The server did not return a valid image.");
      }

      const newImageUrl = URL.createObjectURL(blob);

      image.onload = () => {
        if (currentImageUrl) {
          URL.revokeObjectURL(currentImageUrl);
        }

        currentImageUrl = newImageUrl;
      };

      image.onerror = () => {
        URL.revokeObjectURL(newImageUrl);
        status.textContent = "The generated image could not be displayed.";
      };

      image.src = newImageUrl;
      downloadButton.href = newImageUrl;
      result.hidden = false;
      status.textContent = "✅ Your image is ready!";
      result.scrollIntoView({ behavior: "smooth", block: "center" });

    } catch (error) {
      status.textContent = "❌ " + error.message;

    } finally {
      generateButton.disabled = false;
      generateButton.textContent = "Generate Image";
    }
  });
})();
