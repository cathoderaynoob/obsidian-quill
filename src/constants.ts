import { OpenAIModels } from "@/interfaces";

export const APP_PROPS = {
  appName: "Quill",
  appIcon: "feather",
  copyIcon: "copy",
  editIcon: "settings-2",
  fileIcon: "file",
  fileMissingIcon: "file-question",
  folderIcon: "folder",
  folderAddIcon: "folder-plus",
  folderMissingIcon: "folder-x",
  folderOpenIcon: "folder-open",
  openConvoIcon: "file-text",
  openConvoDisabledIcon: "file",
  openSettingsIcon: "settings",
  newFileIcon: "file-plus",
  saveConvoDisabledIcon: "download",
  saveConvoIcon: "download",
  sendIcon: "bird",
  trashIcon: "trash-2",
};
export const ELEM_CLASSES_IDS = {
  btnAction: "oq-action-button",
  btnWarn: "oq-warn-button",
  clickableIcon: "clickable-icon",
  cmdFooter: "oq-newcommand-footer",
  cmdTarget: "oq-newcommand-target",
  disabled: "oq-disabled",
  filePath: "oq-filepath",
  iconEl: "oq-icon-elem",
  menuDefault: "oq-menu-default",
  menuPlaceholder: "oq-menu-placeholder",
  menuTarget: "oq-newcommand-target",
  menuTemplates: "oq-newcommand-template",
  message: "oq-message",
  messagePad: "oq-message-pad",
  messages: "oq-messages",
  msgContent: "oq-message-content",
  msgHighlight: "oq-message-highlight",
  msgLoader: "oq-message-loader",
  msgStreaming: "oq-message-streaming",
  startNewConvo: "oq-btn-new-conv",
  promptFooter: "oq-prompt-footer",
  promptInput: "oq-prompt-input",
  promptSend: "oq-prompt-send",
  saveConvo: "oq-btn-save-conv",
  textEl: "oq-text-elem",
  validationEmpty: "oq-validation-empty",
};
export const ERROR_MESSAGES = {
  apiKeyAuthFailed: "An issue with your API key was encountered.",
  apiKeyInvalid:
    "Invalid API key. Please enter it at:\n\n" +
    " » Settings > Quill > OpenAI API Key.",
  apiKeyMissing:
    "Missing API key. Please enter it at:\n\n" +
    " » Settings > Quill > OpenAI API Key.",
  fileExistsError: "File with that name already exists.",
  fileNotFound: "Cannot find note at path provided. See console for details.",
  fileReadError: "Error reading note. Please check the console for details.",
  fileSaveError: "Could not save the note. See console for details.",
  fileUploadError:
    "Error uploading note. Please check the console for details.",
  folderCreateError:
    "Error creating folder. Please check the console for details.",
  folderNotFound:
    "Cannot find folder at path provided. See console for details.",
  networkConnectionError:
    "A network connection issue was encountered. " +
    "Are you connected to the internet?",
  networkError: "A network error occurred. See console for details.",
  networkTimeout:
    "Your request has timed out. Please check your connection " +
    "and try again.",
  noCreditsLeft:
    "Out of OpenAI API credits. Go to Settings → Quill and use the Billing " +
    "link to buy more credits.",
  noFeature: "Feature not found",
  saveError: "Unable to save to a note. Please check the console for details.",
  unknown: "An error occurred. Please check the console for details.",
  viewError:
    "Unable to open Quill. Please try again, or check the " +
    "console for any errors.",
} as const;
export type ErrorCode = keyof typeof ERROR_MESSAGES;
export const QUILL_VIEW_TYPE = "quill-chat-view";
export const SCROLL_CHARS_LIMIT = 300;
export const STREAM_BUFFER_LIMIT = 300;
export const EXTERNAL_LINKS = {
  linkOpenAIMyAPIKeys: "https://platform.openai.com/api-keys",
  linkOpenAIAboutModels: "https://platform.openai.com/docs/models",
  linkOpenAIBilling:
    "https://platform.openai.com/settings/organization/billing/overview",
};
export const OPENAI_MODELS: OpenAIModels = {
  models: [
    {
      id: "gpt-4.1",
      name: "GPT-4.1",
    },
    {
      id: "gpt-4.1-nano",
      name: "GPT-4.1 nano",
    },
    {
      id: "gpt-4o",
      name: "GPT-4o",
    },
    {
      id: "gpt-4o-mini",
      name: "GPT-4o Mini",
    },
    {
      id: "chatgpt-4o-latest",
      name: "ChatGPT-4o",
    },
  ],
};
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
};
