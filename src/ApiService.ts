import OpenAI from "openai";
import { Editor, EditorPosition, TFile, Vault } from "obsidian";
import {
  GptRequestPayload,
  IPluginServices,
  OpenAIModel,
  OpenAIModelsSupported,
  OutputTarget,
} from "@/interfaces";
import { QuillPluginSettings } from "@/settings";
import {
  ERROR_MESSAGES,
  OPENAI_MODELS,
  STREAM_BUFFER_LIMIT,
} from "@/constants";
import { ProcessResponse } from "@/featuresRegistry";
import emitter from "@/customEmitter";
import ModalConfirm from "@/components/ModalConfirm";

export default class ApiService {
  pluginServices: IPluginServices;
  settings: QuillPluginSettings;
  openai: OpenAI;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  streamingContent: any | null = null;
  vault: Vault;

  constructor(pluginServices: IPluginServices, settings: QuillPluginSettings) {
    this.pluginServices = pluginServices;
    this.settings = settings;
    this.openai = new OpenAI({
      apiKey: this.settings.openaiApiKey,
      dangerouslyAllowBrowser: true,
    });
    this.vault = pluginServices.app.vault;
  }

  // Gets list of models from OpenAI
  async getModelsFromOpenAI(): Promise<OpenAI.Models.ModelsPage | false> {
    try {
      const models = await this.openai.models.list();
      return models || undefined;
    } catch (e) {
      console.error(e.message);
      return false;
    }
  }

  // Returns OpenAIModel object
  getModelById = (modelId: string): OpenAIModel | undefined => {
    const model = OPENAI_MODELS.models.find((model) => model.id === modelId);
    return model;
  };

  // Returns array of supported model IDs
  getSupportedModelIds = (): string[] => {
    const supportedModelIds: OpenAIModelsSupported[] = OPENAI_MODELS.models.map(
      (model) => model.id
    );
    return supportedModelIds;
  };

  // Validate model is supported by plugin, or is using plugin default.
  isSupportedModel = (modelId: string, suppressNotify?: boolean): boolean => {
    // Return if using plugin default
    if (modelId === "") return true;
    const supportedModelIds = this.getSupportedModelIds();
    // Return if model is supported
    if (supportedModelIds.includes(modelId)) return true;
    // Display modal if an unsupported model is being used.
    if (!suppressNotify) {
      new ModalConfirm(
        this.pluginServices.app,
        `Quill: OpenAI model no longer supported`,
        `This command uses model ${modelId} which is no longer supported. ` +
          `Please select a different model for this command in Settings.`,
        "Open settings",
        false,
        async () => {
          this.pluginServices.openPluginSettings();
        }
      ).open();
    }
    return false;
  };

  async openApiKeyProblemModal(problem: "missing" | "invalid"): Promise<void> {
    const modalContent = {
      missing: {
        title: "Missing API Key",
        message: "Open Settings to add it?",
        notify: "apiKeyMissing",
      },
      invalid: {
        title: "Invalid API Key",
        message: "Open Settings to update it?",
        notify: "apiKeyInvalid",
      },
    };

    const { title, message, notify } = modalContent[problem];

    try {
      new ModalConfirm(
        this.pluginServices.app,
        title,
        message,
        "Open Settings",
        false,
        async () => {
          await this.pluginServices.openPluginSettings();
        }
      ).open();
    } catch (e) {
      console.error(e.message);
      this.pluginServices.notifyError(notify);
    }
  }

  refreshApiKey(): void {
    this.openai.apiKey = this.settings.openaiApiKey;
  }

  async validateApiKey(suppressModal?: boolean): Promise<boolean> {
    // MISSING
    if (!this.settings.openaiApiKey) {
      if (!suppressModal) await this.openApiKeyProblemModal("missing");
      emitter.emit("responseEnd");
      return false;
    }
    // INVALID
    this.refreshApiKey();
    const isApiKeyValid = await this.getModelsFromOpenAI();
    if (isApiKeyValid) {
      return true;
    } else {
      if (!suppressModal) await this.openApiKeyProblemModal("invalid");
      emitter.emit("responseEnd");
      return false;
    }
  }

  // CHAT =====================================================================
  async getStreamingChatResponse(
    payload: GptRequestPayload,
    callback: ProcessResponse,
    outputTarget: OutputTarget = "view",
    editor?: Editor
  ): Promise<string> {
    const bufferLimit = STREAM_BUFFER_LIMIT;
    let errorMsg: string | null = null;
    let bufferedContent = "";
    let completedMessage = "";
    let lastEditorPos: EditorPosition | null = null;
    const bufferContent = (content: string, editor: Editor) => {
      if (!lastEditorPos) {
        lastEditorPos = editor.getCursor();
      }
      bufferedContent += content;
      if (bufferedContent.length >= bufferLimit) {
        callback({
          response: bufferedContent,
          outputTarget: outputTarget,
          editor: editor,
          editorPos: lastEditorPos,
        });
        lastEditorPos = editor.getCursor();
        bufferedContent = "";
      }
    };

    try {
      this.streamingContent = await this.openai.chat.completions.create(
        {
          model: payload.modelId,
          messages: payload.messages,
          stream: true,
          temperature: payload.temperature,
        },
        { timeout: 12000 }
      );

      for await (const chunk of this.streamingContent) {
        const content = chunk.choices[0]?.delta?.content;
        if (typeof content === "string") {
          if (editor) {
            bufferContent(content, editor);
          } else {
            callback({ response: content });
          }
          completedMessage += content;
        }
      }
    } catch (e) {
      errorMsg = this.handleNetworkError(e.message);
      if (e.status === 401) await this.validateApiKey();
    } finally {
      if (outputTarget && bufferedContent.length > 0) {
        callback({
          response: bufferedContent,
          outputTarget: outputTarget,
          editor: editor,
          editorPos: lastEditorPos,
        });
      }
      if (outputTarget === "view")
        // Give completedMessage time to be return before emitting responseEnd
        setTimeout(() => {
          emitter.emit("responseEnd", errorMsg);
          emitter.emit("modalResponseEnd");
        }, 150);
    }
    return completedMessage;
  }

  cancelStream() {
    this.streamingContent?.controller?.abort();
    this.streamingContent = null;
  }

  async getNonStreamingChatResponse(
    payload: GptRequestPayload,
    callback: ProcessResponse,
    outputTarget?: OutputTarget
  ): Promise<void> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: payload.modelId,
        messages: payload.messages,
        temperature: payload.temperature,
      });
      if (completion.choices[0]?.message?.content) {
        callback({
          response: completion.choices[0]?.message?.content,
          outputTarget: outputTarget,
        });
      }
    } catch (e) {
      console.error(e.message);
      if (e.status && e.status === 401) {
        await this.validateApiKey();
      }
    }
  }

  handleNetworkError(errorMsg: string) {
    let msgToUser = "";
    errorMsg = errorMsg.toLowerCase();
    switch (true) {
      case errorMsg.includes("401") || errorMsg.includes("auth"):
        msgToUser = ERROR_MESSAGES.apiKeyAuthFailed;
        break;
      case errorMsg.includes("429") || errorMsg.includes("billing"):
        msgToUser = ERROR_MESSAGES.noCreditsLeft;
        break;
      case errorMsg.includes("connection"):
        msgToUser = ERROR_MESSAGES.networkConnectionError;
        break;
      case errorMsg.includes("timed out"):
        msgToUser = ERROR_MESSAGES.networkTimeout;
        break;
      default:
        msgToUser = ERROR_MESSAGES.networkError;
        break;
    }
    return msgToUser;
  }

  // FILES ====================================================================
  async retrieveFileInfoFromOpenAI(
    file_id: string
  ): Promise<OpenAI.FileObject | false> {
    if (!file_id) {
      this.pluginServices.notifyError(
        "fileNotFound",
        "Unable to check for file: no `file_id` value provided."
      );
      return false;
    }

    try {
      const fileInfo = await this.openai.files.retrieve(file_id);
      return fileInfo;
    } catch (e) {
      console.error(e.message);
      if (e.status && e.status === 401) {
        await this.validateApiKey();
      }
      return false;
    }
  }

  uploadFileFromVault = async (
    file: TFile,
    purpose: OpenAI.FilePurpose
  ): Promise<string | undefined> => {
    if (!file) {
      this.pluginServices.notifyError(
        "fileUploadError",
        "No note provided to upload."
      );
      return;
    }
    const fileContent = await this.vault.adapter.read(file.path);
    const uploadableFile = new File([fileContent], file.name, {
      type: "text/markdown",
    });

    if (uploadableFile) {
      try {
        const uploadResponse = await this.openai.files.create({
          file: uploadableFile,
          purpose: purpose,
        });
        return uploadResponse.id;
      } catch (e) {
        console.error("Error uploading file:", e);
        if (e.status && e.status === 401) {
          await this.validateApiKey();
        }
      }
    } else {
      this.pluginServices.notifyError(
        "fileUploadError",
        `Error reading note ${file.path}`
      );
      return;
    }
  };
}
