import { App, ButtonComponent, Modal, Notice, TFile } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import { Command, IPluginServices } from "@/interfaces";
import { APP_PROPS } from "@/constants";
import { QuillPluginSettings } from "@/settings";
import { getFeatureProperties } from "@/featuresRegistry";
import emitter from "@/customEmitter";
import ModalCustomCommand from "@/components/ModalCustomCommand";
import PromptContent from "@/components/PromptContent";

interface ModalPromptParams {
  app: App;
  settings: QuillPluginSettings;
  pluginServices: IPluginServices;
  onSend: (prompt: string) => void;
  featureId?: string;
  command?: Command;
  customCommandId?: string;
}

// GET PROMPT FROM USER MODAL =================================================
class ModalPrompt extends Modal {
  private modalRoot: Root | null = null;
  private promptValue = "";
  private settings: QuillPluginSettings;
  private pluginServices: IPluginServices;
  onSend: (prompt: string) => void;
  featureId?: string | null;
  command?: Command;
  customCommandId?: string;
  commandTemplatePath?: string;
  model: string;
  rows = 6;
  disabled = false;

  constructor({
    app,
    settings,
    pluginServices,
    onSend,
    featureId,
    command,
    customCommandId,
  }: ModalPromptParams) {
    super(app);
    this.settings = settings;
    this.pluginServices = pluginServices;
    this.onSend = onSend;
    this.featureId = featureId;
    this.command = command;
    this.customCommandId = customCommandId;
    this.handleResponseEnd = this.handleResponseEnd.bind(this);
    emitter.on("modalResponseEnd", this.handleResponseEnd);
  }

  handleResponseEnd = () => {
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

  handleOpenSettings = () => {
    this.pluginServices.openPluginSettings();
    this.close();
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

    // Defer link generation logic to avoid slowing down modal rendering
    setTimeout(() => {
      if (this.command) {
        const targetName =
          this.command.target === "view"
            ? "conversation"
            : this.command.target === "editor"
            ? "note"
            : undefined;
        const targetElement = this.contentEl.querySelector("#oq-prompt-footer");
        if (targetElement) {
          targetElement.textContent = `${this.model} ${
            targetName && `• ${targetName}`
          }`;
          // Add a test link
          targetElement.appendChild(this.generateFileButtonIcon(this.command));
          if (this.customCommandId) {
            targetElement.appendChild(
              this.generateEditButtonIcon(this.customCommandId)
            );
          }
        }
      }
    }, 0);
  }

  generateFileButtonIcon(command: Command) {
    const button = new ButtonComponent(this.contentEl);
    button
      .setClass(APP_PROPS.clickableIcon)
      .setIcon(APP_PROPS.fileIcon)
      .setTooltip("Open template file")
      .onClick(() => {
        if (command?.templateFilename) {
          const filePath = `${this.settings.pathTemplates}/${command.templateFilename}`;
          this.openFileInNewPane(this.app, filePath);
        }
        this.close();
      });
    return button.buttonEl;
  }

  generateEditButtonIcon(customCommandId: string) {
    const button = new ButtonComponent(this.contentEl);
    button
      .setClass(APP_PROPS.clickableIcon)
      .setIcon(APP_PROPS.editIcon)
      .setTooltip("Edit command")
      .onClick(() => {
        new ModalCustomCommand(
          this.app,
          this.settings,
          this.pluginServices,
          async (id: string, command: Command) => {
            this.settings.commands[customCommandId] = command;
            await this.pluginServices.saveSettings();
            await this.pluginServices.loadCommands();
            new Notice(`Updated command:\n${command.name}`);
          },
          customCommandId
        ).open();
        this.close();
      });
    return button.buttonEl;
  }

  updateModal() {
    this.modalRoot?.render(
      <div id="oq-prompt-modal">
        {this.command && (
          <div className="oq-modal-title">
            <div>Quill Custom Command</div>
            <span>{this.command.name}</span>
          </div>
        )}
        <PromptContent
          value={this.promptValue}
          rows={this.rows}
          model={this.model}
          handleInput={this.handleInput}
          handleKeyPress={this.handleKeyPress}
          handleSend={this.handleSend}
          handleOpenSettings={this.handleOpenSettings}
          handleBlur={this.handleBlur}
          disabled={this.disabled} // TODO: Update this to disable sending (???)
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
