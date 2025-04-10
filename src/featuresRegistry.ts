import { App, Editor, EditorPosition } from "obsidian";
import { OutputTarget } from "@/interfaces";
import { renderToEditor } from "@/editorUtils";
import emitter from "@/customEmitter";

type ProcessResponseParams = {
  response: string;
  outputTarget?: OutputTarget;
  editor?: Editor;
  editorPos?: EditorPosition | null;
};
export type ProcessResponse = (params: ProcessResponseParams) => void;

export interface FeatureProperties {
  id: string;
  name?: string;
  prompt: (inputText?: string) => string;
  processResponse: ProcessResponse;
  outputTarget: OutputTarget;
  model?: string;
  temperature?: number;
  stream?: boolean;
}

export const FeaturesRegistry = (
  app: App
): Record<string, FeatureProperties> => {
  const registry: Record<string, FeatureProperties> = {
    // NEW PROMPT
    openPrompt: {
      id: "openPrompt",
      name: "Conversation Message",
      prompt: (inputText: string) => inputText,
      processResponse: ({ response }) =>
        emitter.emit("updateResponseMessage", response),
      outputTarget: "view",
      stream: true,
    },

    // SEND SELECTED TEXT WITH PROMPT
    sendPromptWithSelectedText: {
      id: "sendPromptWithSelectedText",
      name: "Send Selected Text",
      prompt: (inputText: string) => inputText,
      processResponse: ({ response }) =>
        emitter.emit("updateResponseMessage", response),
      outputTarget: "view",
      stream: true,
    },

    // CUSTOM COMMAND TO VIEW
    customCommandToView: {
      id: "customCommandToView",
      prompt: (inputText: string) => inputText,
      processResponse: ({ response }) =>
        emitter.emit("updateResponseMessage", response),
      outputTarget: "view",
      stream: true,
    },

    // CUSTOM COMMAND TO EDITOR
    customCommandToEditor: {
      id: "customCommandToEditor",
      prompt: (inputText: string) => inputText,
      processResponse: async ({ response, editor, editorPos }) => {
        if (response.length && editor && editorPos) {
          await renderToEditor(response, editor, editorPos);
        }
      },
      outputTarget: "editor",
      stream: true,
    },
  };

  return registry;
};

export const getFeatureProperties = (
  app: App,
  id: string
): FeatureProperties | null => {
  const registry = FeaturesRegistry(app);
  return registry[id] || null;
};
