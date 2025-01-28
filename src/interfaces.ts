import { App, Editor } from "obsidian";

export interface Command {
  name: string;
  target: "view" | "modal" | "editor";
  prompt: boolean;
  sendSelectedText: boolean;
  templateFilename: string;
  model?: string;
}

export interface Commands {
  [key: string]: Command;
}

export interface IPluginServices {
  app: App;
  toggleView(): Promise<void>;
  getViewElem(): HTMLElement | null;
  notifyError(errorCode: string, consoleMsg?: string): void;
  saveSettings(): Promise<void>;
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

export type Role = "system" | "user" | "assistant";
export interface PayloadMessagesType {
  role: Role;
  content: string;
}

export type OutputTarget = Editor | "view" | "modal";
