import { App } from "obsidian";
import { OPENAI_MODELS } from "@/constants";

export interface Command {
  name: string;
  target: OutputTarget;
  saveMsgFolder?: string;
  prompt: boolean;
  sendSelectedText: boolean;
  templateFilename: string;
  modelId: OpenAIModelsSupported;
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
  isSupportedModel(modelId: string, suppressNotify?: boolean): boolean;
  getModelById(modelId: string): OpenAIModel | undefined;
}

export interface GptEngines {
  id: string;
  ready: boolean;
  owner: string;
}

export interface GptRequestPayload {
  modelId: string;
  messages: PayloadMessagesType[];
  temperature: number;
}

export interface OpenAIModel {
  id: string;
  name: string;
}
export interface OpenAIModels {
  models: OpenAIModel[];
}
export type OpenAIModelsSupported =
  (typeof OPENAI_MODELS)["models"][number]["id"];

export type OutputTarget = "editor" | "view" | "modal";

export interface PayloadMessagesType {
  role: Role;
  content: string;
}

export type Role = "system" | "user" | "assistant";
