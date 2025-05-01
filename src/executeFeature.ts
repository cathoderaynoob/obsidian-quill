import { Editor } from "obsidian";
import {
  GptRequestPayload,
  PayloadMessagesType,
  OutputTarget,
} from "@/interfaces";
import { buildPromptPayload, buildSystemPrompt } from "@/promptBuilder";
import { FeatureProperties } from "@/featuresRegistry";
import { QuillPluginSettings } from "@/settings";
import { Command, IPluginServices } from "@/interfaces";
import {
  activateEditorKeypress,
  deactivateEditorKeypress,
} from "@/editorUtils";
import ApiService from "@/ApiService";
import DefaultFolderUtils from "@/DefaultFolderUtils";
import emitter from "@/customEmitter";
import PayloadUtils from "@/PayloadMessages";

export interface ExecutionOptions {
  featureId: string;
  inputText?: string;
  selectedText?: string;
  command?: Command;
  formattingGuidance?: string;
  outputTarget?: OutputTarget;
  editor?: Editor;
}

export const executeFeature = async (
  featureRegistry: Record<string, FeatureProperties>,
  options: ExecutionOptions,
  settings: QuillPluginSettings,
  apiService: ApiService,
  pluginServices: IPluginServices
): Promise<boolean> => {
  // options
  const {
    featureId,
    inputText,
    selectedText,
    command,
    formattingGuidance,
    outputTarget,
    editor,
  } = options;

  // Account for any updates to the API key
  apiService.refreshApiKey();

  // Add dependencies
  const { getTemplateFileContent } = DefaultFolderUtils.getInstance(
    pluginServices,
    settings
  );
  const feature = featureRegistry[featureId];
  if (!feature) {
    pluginServices.notifyError("noFeature");
    return false;
  }

  const modelId = command?.modelId || feature.modelId || settings.openaiModelId;
  if (command?.modelId && !apiService.isSupportedModel(command.modelId))
    return false;

  // "view" output: Maintain persistent payload for the conversation context
  // "editor" output: Fresh payload for each command run to ensure isolation
  const payloadMessages =
    feature.outputTarget === "view"
      ? PayloadUtils.getViewInstance()
      : PayloadUtils.getEditorInstance();

  // If starting a new conversation or running a command to editor
  const isFirstMessage = payloadMessages.getAll().length === 0;
  let payloadMessagesArray: PayloadMessagesType[] = [];

  // Add `system` prompt: For a new conversation
  if (isFirstMessage) {
    const systemMsg = buildSystemPrompt(true);
    payloadMessagesArray = payloadMessages.addMessage(systemMsg);
  }

  // For a Custom Command: Get its template file content
  let commandTemplateContent: string | null = null;
  if (command) {
    commandTemplateContent = await getTemplateFileContent(
      command.templateFilename
    );
    if (!commandTemplateContent) return false;
  }

  // Build and add `user` role prompt
  const payloadPrompt = buildPromptPayload({
    inputText: feature.prompt(inputText) || undefined,
    templateText: commandTemplateContent || undefined,
    selectedText: selectedText || undefined,
    formattingGuidance: formattingGuidance || undefined,
  });
  if (!payloadPrompt) return false; // Prevent empty requests

  // Add message to payload
  const userPayloadMessage: PayloadMessagesType = {
    role: "user",
    content: payloadPrompt,
  };
  payloadMessagesArray = payloadMessages.addMessage(userPayloadMessage);

  // If output is to view, display message in the conversation
  if (feature.outputTarget === "view") {
    const emitEvent = ({
      event,
      role,
      modelId,
      prompt,
      selectedText,
      command,
    }: {
      event: string;
      role: string;
      modelId?: string;
      prompt?: string;
      selectedText?: string;
      command?: Command;
    }): Promise<void> => {
      return new Promise<void>((resolve) => {
        emitter.emit(event, role, modelId, prompt, selectedText, command);
        resolve();
      });
    };
    // DISPLAY USER MESSAGE
    await emitEvent({
      event: "newConvoMessage",
      role: "user",
      modelId,
      prompt: inputText,
      selectedText,
      command,
    });
    // DISPLAY ASSISTANT MESSAGE
    await emitEvent({
      event: "newConvoMessage",
      role: "assistant",
      modelId,
      command,
    });
  }

  const payload: GptRequestPayload = {
    modelId: modelId,
    messages: payloadMessagesArray,
    temperature: feature.temperature || settings.openaiTemperature,
  };

  // Non-streaming responses
  if (!feature.stream) {
    await apiService.getNonStreamingChatResponse(
      payload,
      feature.processResponse,
      outputTarget
    );
    return true;
  }
  // Streaming responses...
  let editorElem: HTMLElement | null = null;
  // ... to editor
  if (outputTarget === "editor") {
    // Highlight area of note for streaming output
    setTimeout(() => {
      editorElem = document.querySelector(".cm-editor.cm-focused");
      if (editorElem) {
        editorElem.id = "oq-streaming";
        activateEditorKeypress(editorElem, apiService);
      }
    }, 100);
  }
  // Send payload, receive message
  const completedResponse = await apiService.getStreamingChatResponse(
    payload,
    feature.processResponse,
    outputTarget,
    editor
  );
  // Remove highlight
  if (editorElem) {
    (editorElem as HTMLElement).id = "";
    deactivateEditorKeypress(editorElem);
  }
  // ... to view
  if (feature.outputTarget === "view") {
    payloadMessages.addMessage({
      role: "assistant",
      content: completedResponse,
    });
  }
  return true;
};
