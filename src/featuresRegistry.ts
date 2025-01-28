import { App, Editor, EditorPosition } from "obsidian";
import { PROMPTS } from "@/constants";
import { OutputTarget } from "@/interfaces";
import { renderToEditor } from "@/editorUtils";
import emitter from "@/customEmitter";
import ModalTextOutput from "@/components/ModalTextOutput";

export interface FeatureProperties {
  id: string;
  prompt: (inputText?: string) => string;
  processResponse: (
    response: string,
    outputTarget?: OutputTarget,
    editorPos?: EditorPosition
  ) => void;
  model?: string;
  temperature?: number;
  stream?: boolean;
  outputTarget?: OutputTarget;
}

export const FeaturesRegistry = (
  app: App
): Record<string, FeatureProperties> => {
  const registry: Record<string, FeatureProperties> = {
    // TELL A JOKE
    tellAJoke: {
      id: "tellAJoke",
      prompt: () => PROMPTS.tellAJoke.content,
      processResponse: (response: string) => {
        if (response.length) new ModalTextOutput(app, response).open();
      },
      model: "gpt-4o-mini",
    },

    // CUSTOM COMMAND
    customCommandToView: {
      id: "customCommandToView",
      prompt: (inputText: string) => inputText,
      processResponse: (response: string) =>
        emitter.emit("updateResponseMessage", response),
      stream: true,
      outputTarget: "view",
    },

    customCommandToEditor: {
      id: "customCommandToEditor",
      prompt: (inputText: string) => inputText,
      processResponse: async (
        response: string,
        editor: Editor,
        editorPos: EditorPosition
      ) => {
        if (response.length) {
          await renderToEditor(response, editor, editorPos);
        }
      },
      stream: true,
    },

    // NEW PROMPT
    newPrompt: {
      id: "newPrompt",
      prompt: (inputText: string) => inputText,
      processResponse: (response: string) =>
        emitter.emit("updateResponseMessage", response),
      stream: true,
      outputTarget: "view",
    },

    // SEND SELECTED TEXT WITH PROMPT
    sendPromptWithSelectedText: {
      id: "sendPromptWithSelectedText",
      prompt: (inputText: string) => inputText,
      processResponse: (response: string) =>
        emitter.emit("updateResponseMessage", response),
      stream: true,
      outputTarget: "view",
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
