document.addEventListener("DOMContentLoaded", () => {
  const displayNames = { "MKR": "MKR", "MKB": "MKB", "MKB+": "MKB+", "MK+": "MK+", "MK": "MK" };
  const themes = {
    "MKR": { primary: "#43A047", chatBg: "#FAFAFA", background: "linear-gradient(135deg, #E8F5E9, #C8E6C9)" },
    "MKB": { primary: "#8E24AA", chatBg: "#F3E5F5", background: "linear-gradient(135deg, #F3E5F5, #E1BEE7)" },
    "MKB+": { primary: "#E53935", chatBg: "#FFCDD2", background: "linear-gradient(135deg, #FFCDD2, #EF9A9A)" },
    "MK+": { primary: "#FB8C00", chatBg: "#FFE0B2", background: "linear-gradient(135deg, #FFE0B2, #FFCC80)" },
    "MK":  { primary: "#0288D1", chatBg: "#E1F5FE", background: "linear-gradient(135deg, #E1F5FE, #B3E5FC)" }
  };
  let conversation = [], currentModel = "MK+";
  const modelMapping = { 
    "MKR": "deepseek/deepseek-r1:free", 
    "MKB": "stabilityai/stable-diffusion-2-1", 
    "MK": "nvidia/llama-3.1-nemotron-70b-instruct:free", 
    "MK+": "deepseek/deepseek-chat:free"
  };
  
  const kiSlider = document.getElementById("ki-slider"),
        headerTitle = document.getElementById("header-title"),
        kiName = document.getElementById("kiName"),
        chatContainer = document.getElementById("chat-container"),
        chatArea = document.getElementById("chat-area"),
        btnKISlider = document.getElementById("btn-ki-slider"),
        newConvButton = document.getElementById("new-conversation"),
        userInput = document.getElementById("user-input"),
        sendButton = document.getElementById("send-button"),
        exportButton = document.getElementById("export-chat");
  
  // Dynamische Höhe des Chatbereichs anpassen
  const updateChatHeight = () => {
    const headerHeight = document.querySelector("header").offsetHeight;
    const inputHeight = document.querySelector(".input-area").offsetHeight;
    let margin = 10;
    if(window.innerWidth <= 480) { margin = 2; }
    const availableHeight = window.innerHeight - headerHeight - inputHeight - margin;
    chatArea.style.height = availableHeight + "px";
  };
  window.addEventListener("resize", updateChatHeight);
  updateChatHeight();
  
  const updateTheme = model => {
    const theme = themes[model];
    if (!theme) return;
    document.documentElement.style.setProperty("--primary-color", theme.primary);
    document.body.style.background = theme.background;
    headerTitle.style.color = theme.primary;
    btnKISlider.style.backgroundColor = theme.primary;
    document.querySelectorAll(".input-area button").forEach(btn => {
      btn.style.backgroundColor = theme.primary;
      btn.style.boxShadow = `0 4px 12px ${theme.primary}50`;
    });
    chatContainer.style.background = theme.chatBg;
  };
  
  // Neue Funktion zum Umschalten der Body-Klasse für mobilen Slider
  const toggleBodyClass = () => {
    document.body.classList.toggle('slider-open');
  };

  // Aktualisierte Funktion zum Umschalten des KI-Sliders
  const toggleKISlider = () => {
    kiSlider.classList.toggle("open");
    toggleBodyClass();
    btnKISlider.innerHTML = kiSlider.classList.contains("open")
      ? '<i class="fa-solid fa-xmark"></i> Schließen'
      : '<i class="fa-solid fa-bars"></i> KI Auswahl';
  };

  // Schließe den Slider bei einem Klick außerhalb (nur auf mobilen Geräten)
  document.body.addEventListener('click', (e) => {
    if (document.body.classList.contains('slider-open') && 
        !kiSlider.contains(e.target) && 
        e.target !== btnKISlider) {
      toggleKISlider();
    }
  });
  
  const selectKI = ki => {
    currentModel = ki;
    kiName.textContent = displayNames[ki] || ki;
    ["btn-mkr","btn-mkb","btn-mkbplus","btn-mkplus","btn-mk"].forEach(id => {
      document.getElementById(id).classList.remove("active-ki");
    });
    document.getElementById(`btn-${ki.toLowerCase().replace(/\+/g, "plus")}`).classList.add("active-ki");
    updateTheme(ki);
    toggleKISlider();
  };
  
  document.querySelectorAll(".suggestion-button").forEach(button => {
    button.addEventListener("click", () => { userInput.value = button.textContent; });
  });
  
  const renderMarkdown = text => marked.parse(text);
  
  const appendMessage = (sender, content) => {
    const msg = document.createElement("div");
    msg.classList.add("chat-message", sender === "user" ? "user-message" : "ai-message");
    msg.innerHTML = renderMarkdown(content);
    chatContainer.appendChild(msg);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    if (window.MathJax) { MathJax.typesetPromise(); }
  };
  
  const showThinking = () => {
    const think = document.createElement("div");
    think.id = "thinking-message";
    think.classList.add("chat-message", "ai-message", "thinking");
    think.innerHTML = 'KI denkt <span class="ki-think"><span></span><span></span><span></span></span>';
    chatContainer.appendChild(think);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  };
  
  const removeThinking = () => {
    const think = document.getElementById("thinking-message");
    if (think) think.remove();
  };
  
  const showReasoning = () => {
    const reason = document.createElement("div");
    reason.id = "reasoning-message";
    reason.classList.add("chat-message", "ai-message", "reasoning");
    reason.innerHTML =
      '<p><strong>DeepSeek R1 (Reasoning):</strong> <i class="fa-solid fa-brain icon"></i> <i class="fa-solid fa-spinner icon"></i> <i class="fa-solid fa-brain icon"></i></p>';
    chatContainer.appendChild(reason);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  };
  
  const removeReasoning = () => {
    const reason = document.getElementById("reasoning-message");
    if (reason) reason.remove();
  };
  
  const newConversation = () => { 
    chatContainer.innerHTML = ""; 
    conversation = []; 
  };
  
  const callImageAPI = async (prompt, parameters = {}) => {
    const hf_api_key = "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"; 
    const modelURL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1";
    try {
      const res = await fetch(modelURL, {
        method: "POST",
        headers: { "Authorization": "Bearer " + hf_api_key, "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: prompt, parameters })
      });
      const ctype = res.headers.get("content-type");
      if (ctype && ctype.includes("image")) {
        const blob = await res.blob();
        return { imageUrl: URL.createObjectURL(blob) };
      } else {
        const json = await res.json();
        return { error: JSON.stringify(json) };
      }
    } catch (err) {
      return { error: "Warte ein paar Minuten und versuche es nochmal." };
    }
  };
  
  const callImageStoryAPI = async prompt => {
    const results = [];
    for (let i = 0; i < 5; i++) {
      results.push(await callImageAPI(`Bild ${i+1}/5: ${prompt}`, { num_inference_steps: 50, guidance_scale: 7.5 }));
    }
    return { images: results };
  };
  
  const callOpenRouterAPI = async (conv, model) => {
    const or_api_key = "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";
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + or_api_key,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          max_tokens: 40000,
          messages: conv.map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      return (data && data.choices && data.choices[0]?.message?.content)
        ? { text: data.choices[0].message.content.trim() }
        : { error: "Keine Antwort erhalten." };
    } catch (err) {
      return { error: err.toString() };
    }
  };
  
  const sendMessage = async () => {
    const text = userInput.value.trim();
    if (!text) {
      alert("Bitte gib eine Nachricht ein!");
      return;
    }
    appendMessage("user", text);
    conversation.push({ role: "user", content: text });
    userInput.value = "";
    if (conversation.length > 6) conversation.shift();
  
    if (currentModel === "MKB") {
      const enhancedPrompt = "Bitte erstelle ein qualitativ hochwertiges, sinnvolles Bild: " + text;
      showThinking();
      const result = await callImageAPI(enhancedPrompt, { num_inference_steps: 50, guidance_scale: 7.5 });
      removeThinking();
      if (result.imageUrl) {
        appendMessage("ai", `<p><strong>MKB (Bild):</strong> Bild für "${text}"</p><img src="${result.imageUrl}" alt="Generiertes Bild" style="max-width:100%; border-radius: 10px;">`);
      } else {
        appendMessage("ai", `<p><strong>MKB (Bild) Fehler:</strong> ${result.error}</p>`);
      }
      conversation.push({ role: "assistant", content: result.imageUrl ? "[Bild generiert]" : "[Fehler bei Bildgenerierung]" });
      if (conversation.length > 6) conversation.shift();
    } else if (currentModel === "MKB+") {
      showThinking();
      const result = await callImageStoryAPI(text);
      removeThinking();
      if (result.images && result.images.length === 5) {
        appendMessage("ai", `<p><strong>MKB+ (Bildgeschichte):</strong> Es wurden 5 Bilder generiert.</p>`);
        result.images.forEach((img, index) => {
          if (img.imageUrl) {
            appendMessage("ai", `<p><strong>Bild ${index+1}:</strong></p><img src="${img.imageUrl}" alt="Bild ${index+1}" style="max-width:100%; border-radius: 10px;">`);
          } else {
            appendMessage("ai", `<p><strong>Bild ${index+1} Fehler:</strong> ${img.error}</p>`);
          }
        });
        conversation.push({ role: "assistant", content: "[Bildgeschichte generiert]" });
      } else {
        appendMessage("ai", `<p><strong>MKB+ (Bildgeschichte) Fehler:</strong> ${result.error || "Unbekannter Fehler"}</p>`);
        conversation.push({ role: "assistant", content: "[Fehler bei Bildgeschichte]" });
      }
      if (conversation.length > 6) conversation.shift();
    } else if (currentModel === "MKR") {
      conversation.push({ role: "system", content: "Du bist DeepSeek R1 – spezialisiertes Reasoning-Modell. Bitte schreibe deine vollständige Argumentationskette." });
      showReasoning();
      const result = await callOpenRouterAPI(conversation, modelMapping[currentModel]);
      removeReasoning();
      if (result.text) {
        appendMessage("ai", `<p>${result.text}</p>`);
      } else {
        appendMessage("ai", `<p>Fehler: ${result.error}</p>`);
      }
      conversation.push({ role: "assistant", content: result.text || "[Fehler]" });
      if (conversation.length > 6) conversation.shift();
    } else if (currentModel === "MK+" || currentModel === "MK") {
      showThinking();
      const result = await callOpenRouterAPI(conversation, modelMapping[currentModel]);
      removeThinking();
      if (result.text) {
        appendMessage("ai", `<p>${result.text}</p>`);
      } else {
        appendMessage("ai", `<p>Fehler: ${result.error}</p>`);
      }
      conversation.push({ role: "assistant", content: result.text || "[Fehler]" });
      if (conversation.length > 6) conversation.shift();
    }
  };

  const exportChat = () => {
    const plainText = conversation.map(msg => `${msg.role}: ${msg.content.replace(/<\/?[^>]+(>|$)/g, "")}`).join("\n\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([plainText], { type: "text/plain;charset=utf-8" }));
    link.download = "chat_verlauf.txt";
    link.click();
  };

  btnKISlider.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleKISlider();
  });
  newConvButton.addEventListener("click", newConversation);
  sendButton.addEventListener("click", sendMessage);
  userInput.addEventListener("keyup", e => { if (e.key === "Enter") sendMessage(); });
  document.getElementById("btn-mkr").addEventListener("click", () => selectKI("MKR"));
  document.getElementById("btn-mkb").addEventListener("click", () => selectKI("MKB"));
  document.getElementById("btn-mkbplus").addEventListener("click", () => selectKI("MKB+"));
  document.getElementById("btn-mkplus").addEventListener("click", () => selectKI("MK+"));
  document.getElementById("btn-mk").addEventListener("click", () => selectKI("MK"));
  exportButton.addEventListener("click", exportChat);

  newConversation();
  selectKI("MK+");
});
