import { ButtonComponent, Modal, Notice, TFile } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import { Command, IPluginServices, OutputTarget } from "@/interfaces";
import { APP_PROPS, ELEM_CLASSES_IDS } from "@/constants";
import { QuillPluginSettings } from "@/settings";
import { getFeatureProperties } from "@/featuresRegistry";
import emitter from "@/customEmitter";
import ModalCustomCommand from "@/components/ModalCustomCommand";
import PromptContent from "@/components/PromptContent";

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
  private model: string;
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
    this.handleResponseEnd = this.handleResponseEnd.bind(this);
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

  openFileInNewPane = (filePath: string) => {
    const app = this.pluginServices.app;
    const file = app.vault.getAbstractFileByPath(filePath);
    if (file && file instanceof TFile) {
      app.workspace.getLeaf(true).openFile(file);
    }
  };

  onOpen() {
    const feature = this.featureId
      ? getFeatureProperties(this.app, this.featureId)
      : null;
    this.featureName = feature?.name;
    this.model =
      this.command?.model || feature?.model || this.settings.openaiModel;
    this.modalRoot = createRoot(this.contentEl);
    this.updateModal();
  }

  // TODO: Add this. There will be some associated css updates needed
  // generateFileButtonIcon(command: Command) {
  //   const button = new ButtonComponent(this.contentEl);
  //   button
  //     .setClass(ELEM_CLASSES_IDS.clickableIcon)
  //     .setIcon(APP_PROPS.fileIcon)
  //     .setTooltip("Open template file")
  //     .onClick(() => {
  //       if (command?.templateFilename) {
  //         const filePath =
  //           this.settings.pathTemplates + "/" + command.templateFilename;
  //         this.openFileInNewPane(filePath);
  //       }
  //       this.close();
  //     });
  //   return button.buttonEl;
  // }

  generateEditButtonIcon(customCommandId: string) {
    const button = new ButtonComponent(this.contentEl);
    button
      .setClass(ELEM_CLASSES_IDS.clickableIcon)
      .setIcon(APP_PROPS.editIcon)
      .setTooltip("Edit command")
      .onClick(() => {
        new ModalCustomCommand(
          this.pluginServices,
          this.settings,
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
    // Title differs for custom command vs native command
    const titleContent =
      this.command || this.featureName ? (
        <div className="oq-modal-title">
          <div>{this.command ? "Quill Custom Command" : "Quill Command"}</div>
          <span>{this.command?.name || this.featureName}</span>
        </div>
      ) : null;

    this.modalRoot?.render(
      <div id="oq-prompt-modal">
        {titleContent}
        <PromptContent
          value={this.promptValue}
          rows={this.rows}
          model={this.model}
          outputTarget={this.outputTarget}
          handleInput={this.handleInput}
          handleKeyPress={this.handleKeyPress}
          handleSend={this.handleSend}
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
