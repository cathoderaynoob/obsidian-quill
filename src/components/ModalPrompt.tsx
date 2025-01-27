import { App, Modal, setIcon } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import { Command } from "@/interfaces";
import { QuillPluginSettings } from "@/settings";
import { getFeatureProperties } from "@/featuresRegistry";
import emitter from "@/customEmitter";
import PromptContent from "@/components/PromptContent";
import { APP_PROPS } from "@/constants";

interface ModalPromptParams {
  app: App;
  settings: QuillPluginSettings;
  onSend: (prompt: string) => void;
  featureId?: string;
  command?: Command;
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
  command?: Command;
  model: string;
  rows = 6;
  disabled = false;

  constructor({
    app,
    settings,
    onSend,
    featureId,
    command,
  }: ModalPromptParams) {
    super(app);
    this.settings = settings;
    this.onSend = onSend;
    this.featureId = featureId;
    this.command = command;
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
    this.updateModal(this.model);
  };

  handleBlur = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.value = e.target.value.trim();
  };

  handleSend = () => {
    this.promptValue.trim();
    if (this.disabled || this.promptValue === "") return;
    this.close();
    this.onSend(this.promptValue);
    this.disableSend();
  };

  handleKeyPress = (e: React.KeyboardEvent) => {
    if (this.disabled) this.disableSend();
    if (e.key === "Enter" && e.shiftKey) {
      return;
    } else if (e.key === "Enter") {
      e.stopPropagation();
      e.preventDefault();
      this.handleSend();
    }
  };

  onOpen() {
    const feature = this.featureId
      ? getFeatureProperties(this.app, this.featureId)
      : null;
    this.model = feature?.model || this.settings.openaiModel;

    this.modalRoot = createRoot(this.contentEl);
    this.updateModal(this.model);
  }

  updateModal(model: string) {
    this.modalRoot?.render(
      <div id="oq-prompt-modal">
        {this.command && this.command.name && (
          <span className="title">Quill: {this.command.name}</span>
        )}
        <PromptContent
          value={this.promptValue}
          rows={this.rows}
          model={this.model}
          handleInput={this.handleInput}
          handleKeyPress={this.handleKeyPress}
          handleSend={this.handleSend}
          handleBlur={this.handleBlur}
          disabled={this.disabled} // TODO: Update this to disable sending
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
