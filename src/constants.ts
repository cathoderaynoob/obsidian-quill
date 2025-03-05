export const APP_PROPS = {
  appName: "Quill",
  appIcon: "feather",
  editIcon: "settings",
  fileIcon: "file",
  fileMissingIcon: "file-question",
  folderIcon: "folder",
  openSettingsIcon: "settings-2",
  saveToFileIcon: "file-plus",
  sendIcon: "bird",
  trashIcon: "trash-2",
};
export const ELEM_CLASSES_IDS = {
  cmdFooter: "oq-newcommand-footer",
  cmdTarget: "oq-newcommand-target",
  cmdTemplate: "oq-newcommand-template",
  message: "oq-message",
  messagePad: "oq-message-pad",
  messages: "oq-messages",
  msgHighlight: "oq-message-highlight",
  msgStreaming: "oq-message-streaming",
  newConversation: "oq-btn-new-conv",
  saveConversation: "oq-btn-save-conv",
  promptInput: "oq-prompt-input",
  promptSend: "oq-prompt-send",
  settingsButton: "clickable-icon",
  validationEmpty: "oq-validation-empty",
};
export const ERROR_MESSAGES = {
  apiKeyMissing:
    "Missing API key. Please enter it at:\n\n" +
    " » Settings > Quill > OpenAI API Key.",
  apiKeyInvalid:
    "Invalid API key. Please enter it at:\n\n" +
    " » Settings > Quill > OpenAI API Key.",
  fileNotFound: "Cannot find file at path provided. See console for details.",
  fileReadError: "Error reading file. Please check the console for details.",
  fileUploadError:
    "Error uploading file. Please check the console for details.",
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
