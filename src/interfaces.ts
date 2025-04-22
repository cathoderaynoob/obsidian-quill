import { App } from "obsidian";

export interface Command {
  name: string;
  target: OutputTarget;
  prompt: boolean;
  sendSelectedText: boolean;
  templateFilename: string;
  model?: string;
}
export interface Commands {
  [key: string]: Command;
}

export type DefaultSaveFolder = "conversations" | "messages" | "templates";
export type folderSettingNames =
  | "pathConversations"
  | "pathMessages"
  | "pathTemplates";

export interface IPluginServices {
  app: App;
  activateView(): Promise<void>;
  getViewElem(): HTMLElement | null;
  notifyError(errorCode: string, consoleMsg?: string): void;
  saveSettings(): Promise<void>;
  openPluginSettings(): Promise<void>;
  loadCommands(): Promise<void>;
}

export interface GptEngines {
  id: string;
  ready: boolean;
  owner: string;
}

export interface GptRequestPayload {
  model: string;
  messages: PayloadMessagesType[];
  temperature: number;
}

export interface OpenAIModels {
  user: {
    model: string;
    display: string;
  }[];
}

export type OutputTarget = "editor" | "view" | "modal";

export interface PayloadMessagesType {
  role: Role;
  content: string;
}

export type Role = "system" | "user" | "assistant";
