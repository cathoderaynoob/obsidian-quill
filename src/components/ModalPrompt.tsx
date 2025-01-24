import { App, Modal } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import { QuillPluginSettings } from "@/settings";
import { getFeatureProperties } from "@/featuresRegistry";
import emitter from "@/customEmitter";
import PromptContent from "@/components/PromptContent";

interface ModalPromptParams {
  app: App;
  settings: QuillPluginSettings;
  onSend: (prompt: string) => void;
  featureId?: string;
}

export interface ModalPromptFileParams extends ModalPromptParams {
  onSend: (prompt: string, filePath?: string) => void;
}

// GET PROMPT FROM USER MODAL =================================================
class ModalPrompt extends Modal {
  modalRoot: Root | null = null;
  promptValue = "";
  settings: QuillPluginSettings;
  onSend: (prompt: string) => void;
  featureId?: string | null;
  rows = 6;
  disabled = false;

  constructor({ app, settings, onSend, featureId }: ModalPromptParams) {
    super(app);
    this.settings = settings;
    this.onSend = onSend;
    this.featureId = featureId;
    this.handleStreamEnd = this.handleStreamEnd.bind(this);
    emitter.on("modalStreamEnd", this.handleStreamEnd);
  }

  handleStreamEnd = () => {
    this.enableSend();
  };

  enableSend = (): void => {
    this.disabled = false;
  };

  disableSend = (): void => {
    this.disabled = true;
  };

  handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.promptValue = e.target.value;
  };

  handleBlur = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.value = e.target.value.trim();
  };

  handleSend = () => {
    if (this.disabled) return;
    this.close();
    this.onSend(this.promptValue.trim());
    this.disableSend();
  };

  handleKeyPress = (e: React.KeyboardEvent) => {
    if (this.disabled) this.disableSend();
    if (e.key === "Enter" && e.shiftKey) {
      return;
    } else if (e.key === "Enter") {
      e.stopPropagation();
      e.preventDefault();
      this.close();
      this.handleSend();
    }
  };

  onOpen() {
    const feature = this.featureId
      ? getFeatureProperties(this.app, this.featureId)
      : null;
    const model = feature?.model || this.settings.openaiModel;

    this.modalRoot = createRoot(this.contentEl);
    this.modalRoot.render(
      <div id="oq-prompt-modal">
        <PromptContent
          value={this.promptValue}
          rows={this.rows}
          model={model}
          handleInput={this.handleInput}
          handleKeyPress={this.handleKeyPress}
          handleSend={this.handleSend}
          handleBlur={this.handleBlur}
          disabled={this.disabled} // Update this to disable sending
        />
      </div>
    );
  }

  onClose() {
    this.modalRoot?.unmount();
    const { contentEl } = this;
    contentEl.empty();
  }
}

export default ModalPrompt;
