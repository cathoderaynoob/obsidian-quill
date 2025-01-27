export const APP_PROPS = {
  appName: "Quill",
  appIcon: "feather",
  sendIcon: "bird",
  templateIcon: "file-cog",
};
export const ELEM_CLASSES = {
  message: "oq-message",
  promptInput: "oq-prompt-input",
  promptSend: "oq-prompt-send",
};
export const ELEM_IDS = {
  messages: "oq-messages",
  messagePad: "oq-message-pad",
  newConversation: "oq-btn-new-conv",
};
export const ERROR_MESSAGES = {
  fileNotFound: "Cannot find file at path provided. See console for details.",
  fileReadError: "Error reading file. Please check the console for details.",
  fileUploadError:
    "Error uploading file. Please check the console for details.",
  noApiKey:
    "Your OpenAI API key is missing. Please enter it in the " +
    "community plugin settings for Quill.",
  noEngines: "No engines found. More information can be found in the console.",
  noFeature: "Feature not found",
  saveError: "Unable to save to a note. Please check the console for details.",
  unknown: "An error occurred. Please check the console for details.",
  viewError:
    "Unable to open Quill. Please try again, or check the " +
    "console for any errors.",
} as const;
export type ErrorCode = keyof typeof ERROR_MESSAGES;
export const QUILL_VIEW_TYPE = "quill-chat-view";
export const SCROLL_CHARS_LIMIT = 400;
export const STREAM_BUFFER_LIMIT = 300;
export const PROMPTS = {
  systemInitial: {
    role: "system",
    content:
      "You are an assistant integrated into Obsidian, a powerful note-taking " +
      "application. Your primary objective is to function as a research " +
      "assistant. Provide answers that are clear, concise, and accurate. Based " +
      "on user conversations, generate well-structured notes. Adhere to any " +
      "provided template guidelines. Maintain a matter-of-fact and reserved " +
      "tone. Correct any faulty presumptions detected in user inputs.\n\n" +
      "Formatting Instructions:\n\nStyle your response in markdown format " +
      "where it will improve readability and impact. Use sparingly. " +
      "Do not add conversation preamble, summaries, or labels when asked " +
      "for specific content, since the entire output will be copied directly " +
      "to a note. ALWAYS REPLY, EVEN WHEN TESTING.",
  },
  tellAJoke: {
    role: "user",
    content:
      "Tell me a joke (and only the joke) in the style of Anthony Jeselnik.",
  },
};
