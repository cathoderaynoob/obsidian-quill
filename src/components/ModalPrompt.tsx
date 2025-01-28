import { App, Modal, TFile } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import { APP_PROPS } from "@/constants";
import { Command } from "@/interfaces";
import { QuillPluginSettings } from "@/settings";
import { getFeatureProperties } from "@/featuresRegistry";
import emitter from "@/customEmitter";
import PromptContent from "@/components/PromptContent";

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
  commandTemplatePath?: string;
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
    this.updateModal();
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

  openFileInNewPane = (app: App, filePath: string) => {
    const file = app.vault.getAbstractFileByPath(filePath);
    if (file && file instanceof TFile) {
      app.workspace.getLeaf(true).openFile(file);
    }
  };

  onOpen() {
    const feature = this.featureId
      ? getFeatureProperties(this.app, this.featureId)
      : null;
    this.model =
      this.command?.model || feature?.model || this.settings.openaiModel;
    this.modalRoot = createRoot(this.contentEl);
    this.updateModal();
  }

  updateModal() {
    this.modalRoot?.render(
      <div id="oq-prompt-modal">
        {this.command && (
          <span className="oq-modal-title">
            {APP_PROPS.appName}:{" "}
            <a
              href={`obsidian://open?file=${this.command.templateFilename}`}
              onClick={(e) => {
                e.preventDefault();
                if (this.command?.templateFilename) {
                  const filePath = `${this.settings.templatesFolder}/${this.command.templateFilename}`;
                  this.openFileInNewPane(this.app, filePath);
                }
                this.close();
              }}
            >
              {this.command.name}
            </a>
          </span>
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
