import { App } from "obsidian";
import { OPENAI_MODELS } from "@/constants";

export interface Command {
  name: string;
  target: OutputTarget;
  saveMsgFolder?: string;
  prompt: boolean;
  sendSelectedText: boolean;
  templateFilename: string;
  modelId: OpenAIModelId;
}
export interface Commands {
  [key: string]: Command;
}

export type DefaultSaveFolder = "conversations" | "messages" | "templates";
export type folderSettingNames =
  | "pathConversations"
  | "pathMessages"
  | "pathTemplates";

export interface Hyperlink {
  url: string;
  title?: string;
}

export interface IPluginServices {
  app: App;
  activateView(): Promise<void>;
  getViewElem(): HTMLElement | null;
  notifyError(errorCode: string, consoleMsg?: string): void;
  saveSettings(): Promise<void>;
  openPluginSettings(): Promise<void>;
  loadCommands(): Promise<void>;
  isSupportedModel(modelId: OpenAIModelId, suppressNotify?: boolean): boolean;
  getModelById(modelId: OpenAIModelId): OpenAIModel | undefined;
}

export interface GptEngines {
  id: string;
  ready: boolean;
  owner: string;
}

export interface GptRequestPayload {
  modelId: OpenAIModelId;
  messages: PayloadMessagesType[];
}

export interface OpenAIModel {
  id: string;
  name: string;
}
export type OpenAIModelId = (typeof OPENAI_MODELS)[number]["id"];

export type OutputTarget = "editor" | "view" | "modal";

export interface PayloadMessagesType {
  role: Role;
  content: string;
}

export type Role = "system" | "user" | "assistant";
