const languages = [
  { code: "en", name: "English" },
  { code: "ur", name: "Urdu" },
  { code: "ar", name: "Arabic" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "tr", name: "Turkish" },
  { code: "hi", name: "Hindi" },
  { code: "ru", name: "Russian" },
  { code: "zh-CN", name: "Chinese (Simplified)" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "nl", name: "Dutch" },
  { code: "id", name: "Indonesian" },
  { code: "pl", name: "Polish" },
  { code: "sv", name: "Swedish" },
  { code: "da", name: "Danish" },
  { code: "fi", name: "Finnish" },
  { code: "cs", name: "Czech" },
  { code: "el", name: "Greek" },
  { code: "he", name: "Hebrew" },
  { code: "ro", name: "Romanian" },
  { code: "hu", name: "Hungarian" },
  { code: "th", name: "Thai" },
  { code: "vi", name: "Vietnamese" }
];

const sourceLanguage = document.getElementById("sourceLanguage");
const targetLanguage = document.getElementById("targetLanguage");
const sourceText = document.getElementById("sourceText");
const translatedText = document.getElementById("translatedText");
const charCount = document.getElementById("charCount");
const activityIndicator = document.getElementById("activityIndicator");
const sourceLabel = document.getElementById("sourceLabel");
const targetLabel = document.getElementById("targetLabel");
const swapButton = document.getElementById("swapButton");
const clearButton = document.getElementById("clearButton");
const copyButton = document.getElementById("copyButton");
const speakButton = document.getElementById("speakButton");

let debounceTimer;
let controller;
let requestCounter = 0;

function languageName(code) {
  return languages.find((language) => language.code === code)?.name || code;
}

function populateLanguages() {
  languages.forEach((language) => {
    sourceLanguage.add(new Option(language.name, language.code));
    targetLanguage.add(new Option(language.name, language.code));
  });

  sourceLanguage.value = "en";
  targetLanguage.value = "ur";
  updateLanguageLabels();
}

function updateLanguageLabels() {
  sourceLabel.textContent = languageName(sourceLanguage.value);
  targetLabel.textContent = languageName(targetLanguage.value);
}

function updateCount() {
  charCount.textContent = `${sourceText.value.length} / 500`;
}

function setActivity(message, state = "") {
  activityIndicator.textContent = message;
  activityIndicator.className = state;
}

function setTranslation(text, hasResult = false) {
  translatedText.textContent = text;
  translatedText.classList.toggle("is-placeholder", !hasResult);
  copyButton.disabled = !hasResult;
  speakButton.disabled = !hasResult;
}

function queueTranslation() {
  clearTimeout(debounceTimer);
  updateCount();
  updateLanguageLabels();

  const text = sourceText.value.trim();

  if (!text) {
    if (controller) controller.abort();
    setTranslation("Translation appears here.", false);
    setActivity("Waiting for text");
    return;
  }

  setActivity("Typing…");
  debounceTimer = setTimeout(translateText, 700);
}

async function translateText() {
  const text = sourceText.value.trim();
  const source = sourceLanguage.value;
  const target = targetLanguage.value;

  if (!text) return;

  if (source === target) {
    setTranslation(text, true);
    setActivity("Same language selected", "success");
    return;
  }

  if (controller) controller.abort();
  controller = new AbortController();

  const currentRequest = ++requestCounter;

  setActivity("Translating…", "loading");

  try {
    const params = new URLSearchParams({
      q: text,
      langpair: `${source}|${target}`
    });

    const response = await fetch(
      `https://api.mymemory.translated.net/get?${params.toString()}`,
      { signal: controller.signal }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (currentRequest !== requestCounter) return;

    if (data.responseStatus !== 200 || !data.responseData?.translatedText) {
      throw new Error(data.responseDetails || "Translation unavailable");
    }

    setTranslation(data.responseData.translatedText, true);
    setActivity("Updated", "success");
  } catch (error) {
    if (error.name === "AbortError") return;
    console.error(error);
    setActivity("Translation failed", "error");
  }
}

function swapLanguages() {
  const previousSource = sourceLanguage.value;
  sourceLanguage.value = targetLanguage.value;
  targetLanguage.value = previousSource;

  if (!translatedText.classList.contains("is-placeholder")) {
    const oldSourceText = sourceText.value;
    sourceText.value = translatedText.textContent;
    setTranslation(oldSourceText, true);
    updateCount();
  }

  updateLanguageLabels();
  queueTranslation();
}

function clearAll() {
  clearTimeout(debounceTimer);

  if (controller) controller.abort();

  sourceText.value = "";
  updateCount();
  setTranslation("Translation appears here.", false);
  setActivity("Waiting for text");
  sourceText.focus();
}

async function copyTranslation() {
  try {
    await navigator.clipboard.writeText(translatedText.textContent);
    const oldText = copyButton.textContent;
    copyButton.textContent = "Copied";
    setActivity("Copied to clipboard", "success");

    setTimeout(() => {
      copyButton.textContent = oldText;
    }, 1300);
  } catch {
    setActivity("Copy failed", "error");
  }
}

function speakTranslation() {
  if (!("speechSynthesis" in window)) {
    setActivity("Speech not supported", "error");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(translatedText.textContent);
  utterance.lang = targetLanguage.value;

  window.speechSynthesis.speak(utterance);
  setActivity("Playing audio", "success");
}

sourceText.addEventListener("input", queueTranslation);
sourceLanguage.addEventListener("change", queueTranslation);
targetLanguage.addEventListener("change", queueTranslation);
swapButton.addEventListener("click", swapLanguages);
clearButton.addEventListener("click", clearAll);
copyButton.addEventListener("click", copyTranslation);
speakButton.addEventListener("click", speakTranslation);

populateLanguages();
updateCount();
