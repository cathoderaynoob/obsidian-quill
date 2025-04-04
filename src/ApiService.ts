import OpenAI from "openai";
import { Editor, EditorPosition, TFile, Vault } from "obsidian";
import { GptRequestPayload, IPluginServices, OutputTarget } from "@/interfaces";
import { QuillPluginSettings } from "@/settings";
import { STREAM_BUFFER_LIMIT } from "@/constants";
import emitter from "@/customEmitter";
import ModalConfirm from "@/components/ModalConfirm";
import PayloadMessages from "@/PayloadMessages";

export default class ApiService {
  pluginServices: IPluginServices;
  settings: QuillPluginSettings;
  openai: OpenAI;
  payloadMessages: PayloadMessages;
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
    this.payloadMessages = PayloadMessages.getInstance();
    this.vault = pluginServices.app.vault;
  }

  async getModels(): Promise<OpenAI.Models.ModelsPage | false> {
    try {
      const models = await this.openai.models.list();
      return models || undefined;
    } catch (e) {
      console.log(e.message);
      return false;
    }
  }

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
      console.log(e.message);
      this.pluginServices.notifyError(notify);
    }
  }

  refreshApiKey(): void {
    this.openai.apiKey = this.settings.openaiApiKey;
  }

  async validateApiKey(suppressNotice?: boolean): Promise<boolean> {
    // MISSING
    if (!this.settings.openaiApiKey) {
      if (!suppressNotice) await this.openApiKeyProblemModal("missing");
      emitter.emit("responseEnd");
      return false;
    }
    // INVALID
    this.refreshApiKey();
    const isApiKeyValid = await this.getModels();
    if (isApiKeyValid) {
      return true;
    } else {
      if (!suppressNotice) await this.openApiKeyProblemModal("invalid");
      emitter.emit("responseEnd");
      return false;
    }
  }

  // CHAT =====================================================================
  async getStreamingChatResponse(
    payload: GptRequestPayload,
    callback: (
      response: string,
      outputTarget?: OutputTarget,
      editorPos?: EditorPosition
    ) => void,
    outputTarget: OutputTarget = "view"
  ): Promise<string> {
    const bufferLimit = STREAM_BUFFER_LIMIT;
    let bufferedContent = "";
    let completedMessage = "";
    let lastEditorPos: EditorPosition | null = null;
    const bufferContent = (content: string, editor: Editor) => {
      if (!lastEditorPos) {
        lastEditorPos = editor.getCursor();
      }
      bufferedContent += content;
      if (bufferedContent.length >= bufferLimit) {
        callback(bufferedContent, outputTarget, lastEditorPos);
        lastEditorPos = editor.getCursor();
        bufferedContent = "";
      }
    };

    try {
      this.streamingContent = await this.openai.chat.completions.create({
        model: payload.model,
        messages: payload.messages,
        stream: true,
        temperature: payload.temperature,
      });

      for await (const chunk of this.streamingContent) {
        const content = chunk.choices[0]?.delta?.content;
        if (typeof content === "string") {
          if (outputTarget instanceof Editor) {
            bufferContent(content, outputTarget);
          } else {
            callback(content);
          }
          completedMessage += content;
        }
      }
    } catch (e) {
      console.log(e.message);
      if (e.status && e.status === 401) {
        await this.validateApiKey();
      }
    } finally {
      if (outputTarget && bufferedContent.length > 0) {
        callback(bufferedContent, outputTarget);
      }
      // Give completedMessage time to be return before emitting responseEnd
      setTimeout(() => {
        emitter.emit("responseEnd");
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
    callback: (text: string, outputTarget?: OutputTarget) => void,
    outputTarget?: OutputTarget
  ): Promise<void> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: payload.model,
        messages: payload.messages,
        temperature: payload.temperature,
      });
      if (completion.choices[0]?.message?.content) {
        callback(
          completion.choices[0]?.message?.content,
          outputTarget || undefined
        );
      }
    } catch (e) {
      console.log(e.message);
      if (e.status && e.status === 401) {
        await this.validateApiKey();
      }
    }
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
      console.log(e.message);
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
        "No file provided to upload."
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
        console.log("Error uploading file:", e);
        if (e.status && e.status === 401) {
          await this.validateApiKey();
        }
      }
    } else {
      this.pluginServices.notifyError(
        "fileUploadError",
        `Error reading file ${file.path}`
      );
      return;
    }
  };
}
