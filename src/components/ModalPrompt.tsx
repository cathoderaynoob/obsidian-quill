import { Modal, Notice } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import { Command, IPluginServices, OutputTarget } from "@/interfaces";
import { QuillPluginSettings } from "@/settings";
import { getFeatureProperties } from "@/featuresRegistry";
import emitter from "@/customEmitter";
import ModalCustomCommand from "@/components/ModalCustomCommand";
import PromptContent from "@/components/PromptContent";
import VaultUtils from "@/VaultUtils";

interface ModalPromptParams {
  settings: QuillPluginSettings;
  pluginServices: IPluginServices;
  outputTarget: OutputTarget;
  onSend: (prompt: string) => void;
  featureId?: string;
  command?: Command;
  customCommandId?: string;
}

// GET PROMPT FROM USER MODAL =================================================
class ModalPrompt extends Modal {
  private settings: QuillPluginSettings;
  private pluginServices: IPluginServices;
  private outputTarget: string;
  private onSend: (prompt: string) => void;
  private featureId?: string | null;
  private command?: Command;
  customCommandId?: string;

  commandTemplatePath?: string;
  private modalRoot: Root | null = null;
  private promptValue = "";
  private modelDesc: string;
  private featureName: string | undefined;
  private isDisabled = false;
  private rows = 6;

  constructor({
    settings,
    pluginServices,
    onSend,
    featureId,
    command,
    customCommandId,
    outputTarget,
  }: ModalPromptParams) {
    super(pluginServices.app);
    this.settings = settings;
    this.pluginServices = pluginServices;
    this.onSend = onSend;
    this.featureId = featureId;
    this.command = command;
    this.customCommandId = customCommandId;
    this.outputTarget = outputTarget;
    emitter.on("modalResponseEnd", this.handleResponseEnd);
  }

  handleResponseEnd = () => {
    this.enableSend();
  };

  enableSend = (): void => {
    this.isDisabled = false;
  };

  disableSend = (): void => {
    this.isDisabled = true;
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
    if (this.isDisabled || this.promptValue === "") return;
    this.close();
    this.onSend(this.promptValue);
    this.disableSend();
  };

  handleOpenTemplate = async () => {
    if (!this.command) return;
    const vaultUtils = VaultUtils.getInstance(
      this.pluginServices,
      this.settings
    );
    const filePath =
      this.settings.pathTemplates + "/" + this.command.templateFilename;
    if (vaultUtils.getFileByPath(filePath)) {
      const opened = await vaultUtils.openFile(
        `${this.settings.pathTemplates}/${this.command.templateFilename}`,
        true
      );
      if (opened) this.close();
    }
  };

  handleEditCommand = () => {
    new ModalCustomCommand(
      this.pluginServices,
      this.settings,
      async (id: string, command: Command) => {
        this.settings.commands[id] = command;
        await this.pluginServices.saveSettings();
        await this.pluginServices.loadCommands();
        new Notice(`Updated command:\n"${command.name}"`);
      },
      this.customCommandId
    ).open();
    this.close();
  };

  handleOpenSettings = () => {
    this.pluginServices.openPluginSettings();
    this.close();
  };

  handleKeyPress = (e: React.KeyboardEvent) => {
    if (this.isDisabled) this.disableSend();
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
    this.featureName = feature?.name;
    const modelId =
      this.command?.modelId || feature?.modelId || this.settings.openaiModelId;
    this.modelDesc = this.pluginServices.getModelById(modelId)?.name || modelId;
    this.modalRoot = createRoot(this.contentEl);
    this.updateModal();
  }

  updateModal() {
    // Title differs for custom command vs native command
    const titleContent =
      this.command || this.featureName ? (
        <div className="oq-modal-title">
          <div>{this.command ? "Quill Custom Command" : "Quill Command"}</div>
          <span>{this.command?.name || this.featureName}</span>
        </div>
      ) : null;

    const handleOpenTemplate = this.command
      ? this.handleOpenTemplate
      : undefined;
    const handleEditCommand = this.command ? this.handleEditCommand : undefined;

    this.modalRoot?.render(
      <div id="oq-prompt-modal">
        {titleContent}
        <PromptContent
          value={this.promptValue}
          rows={this.rows}
          modelDesc={this.modelDesc}
          outputTarget={this.outputTarget}
          handleInput={this.handleInput}
          handleKeyPress={this.handleKeyPress}
          handleSend={this.handleSend}
          handleOpenTemplate={handleOpenTemplate}
          handleEditCommand={handleEditCommand}
          handleOpenSettings={this.handleOpenSettings}
          handleBlur={this.handleBlur}
          disabled={this.isDisabled}
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
