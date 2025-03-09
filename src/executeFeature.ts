import { Editor, normalizePath, TFile } from "obsidian";
import { PROMPTS } from "@/constants";
import {
  GptRequestPayload,
  PayloadMessagesType,
  OutputTarget,
} from "@/interfaces";
import { buildPromptPayload } from "@/promptBuilder";
import { FeatureProperties } from "@/featuresRegistry";
import { QuillPluginSettings } from "@/settings";
import { Command, IPluginServices } from "@/interfaces";
import {
  activateEditorKeypress,
  deactivateEditorKeypress,
} from "@/editorUtils";
import ApiService from "@/ApiService";
import emitter from "@/customEmitter";
import PayloadMessages from "@/PayloadMessages";
import VaultUtils from "@/VaultUtils";

export interface ExecutionOptions {
  id: string;
  inputText?: string;
  selectedText?: string;
  command?: Command;
  formattingGuidance?: string;
  outputTarget?: OutputTarget;
}

export const executeFeature = async (
  featureRegistry: Record<string, FeatureProperties>,
  options: ExecutionOptions,
  settings: QuillPluginSettings,
  apiService: ApiService,
  payloadMessages: PayloadMessages,
  pluginServices: IPluginServices
): Promise<boolean> => {
  // options
  const {
    id,
    inputText,
    selectedText,
    command: command,
    formattingGuidance,
    outputTarget,
  } = options;

  if (!(await apiService.validateApiKey())) return false;

  const vaultUtils = VaultUtils.getInstance(pluginServices, settings);
  const feature = featureRegistry[id];
  if (!feature) {
    pluginServices.notifyError("noFeature");
    return false;
  }
  // Custom Command Template File
  let commandTemplateContent: string | undefined;
  if (command) {
    // Read content from template file
    const templateFilePath = normalizePath(
      `${settings.templatesFolder}/${command.templateFilename}`
    );
    const templateFile: TFile = vaultUtils.getFileByPath(templateFilePath);
    commandTemplateContent = await vaultUtils.getFileContent(templateFile);
  }

  // Build prompt payload
  const payloadPrompt = buildPromptPayload({
    inputText: feature.prompt(inputText) || undefined,
    templateText: commandTemplateContent || undefined,
    selectedText: selectedText || undefined,
    formattingGuidance: formattingGuidance || undefined,
  });
  if (!payloadPrompt) return false; // Prevent empty requests

  let payloadMessagesArray: PayloadMessagesType[] = [];
  const newPayloadMessage: PayloadMessagesType = {
    role: "user",
    content: payloadPrompt,
  };

  if (payloadMessages.getAll().length === 0) {
    // Compose system prompt
    const today = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    let systemContent = `Today is ${today}.`;
    if (feature.outputTarget === "view") {
      systemContent += ` ${PROMPTS.systemInitial.content}`;
    }
    const systemMsg: PayloadMessagesType = {
      role: "system",
      content: systemContent,
    };
    payloadMessagesArray = payloadMessages.addMessage(systemMsg);
  }
  payloadMessagesArray = payloadMessages.addMessage(newPayloadMessage);

  const model = command?.model || feature.model || settings.openaiModel;

  if (feature.outputTarget === "view") {
    const emitEvent = (
      event: string,
      role: string,
      model?: string,
      prompt?: string,
      selectedText?: string,
      commandName?: string
    ): Promise<void> => {
      return new Promise<void>((resolve) => {
        emitter.emit(event, role, model, prompt, selectedText, commandName);
        resolve();
      });
    };
    await emitEvent(
      "newMessage",
      "user",
      model,
      inputText,
      selectedText,
      command?.name
    );
    await emitEvent("newMessage", "assistant", model);
  }

  const payload: GptRequestPayload = {
    model: model,
    messages: payloadMessagesArray,
    temperature: feature.temperature || settings.openaiTemperature,
  };

  if (feature.stream) {
    let editorElem: HTMLElement | null = null;
    if (outputTarget instanceof Editor) {
      setTimeout(() => {
        editorElem = document.querySelector(".cm-editor.cm-focused");
        if (editorElem) {
          editorElem.id = "oq-streaming";
          activateEditorKeypress(editorElem, apiService);
        }
      }, 100);
    }
    const completedResponse = await apiService.getStreamingChatResponse(
      payload,
      feature.processResponse,
      outputTarget
    );
    if (feature.outputTarget === "view") {
      payloadMessages.addMessage({
        role: "assistant",
        content: completedResponse,
      });
    }
    if (editorElem) {
      (editorElem as HTMLElement).id = "";
      deactivateEditorKeypress(editorElem);
    }
  } else {
    await apiService.getNonStreamingChatResponse(
      payload,
      feature.processResponse,
      outputTarget
    );
  }
  return true;
};
