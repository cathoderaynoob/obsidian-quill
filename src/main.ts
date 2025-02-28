import { Editor, Notice, Plugin, WorkspaceLeaf } from "obsidian";
import {
  ErrorCode,
  APP_PROPS,
  ERROR_MESSAGES,
  QUILL_VIEW_TYPE,
} from "@/constants";
import {
  DEFAULT_SETTINGS,
  QuillPluginSettings,
  QuillSettingsTab,
} from "@/settings";
import { Command, Commands, IPluginServices, OutputTarget } from "@/interfaces";
import ApiService from "@/ApiService";
import Features from "@/Features";
import ModalCustomCommand from "@/components/ModalCustomCommand";
import ModalPrompt from "@/components/ModalPrompt";
import QuillView from "@/components/view";

export default class QuillPlugin extends Plugin implements IPluginServices {
  settings: QuillPluginSettings;
  apiService: ApiService;
  features: Features;
  pluginServices: IPluginServices;
  openModals: ModalPrompt[] = [];

  async onload(): Promise<void> {
    console.clear(); // TODO: Remove this line before publishing
    await this.loadSettings();
    this.apiService = new ApiService(this, this.settings);
    this.features = new Features(this.app, this.apiService, this.settings);
    this.pluginServices = {
      app: this.app,
      toggleView: this.toggleView.bind(this),
      getViewElem: this.getViewElem.bind(this),
      notifyError: this.notifyError.bind(this),
      saveSettings: this.saveSettings.bind(this),
      openPluginSettings: this.openPluginSettings.bind(this),
      loadCommands: this.loadCommands.bind(this),
    };

    this.addSettingTab(
      new QuillSettingsTab(this.app, this, this.pluginServices)
    );
    this.registerView(
      QUILL_VIEW_TYPE,
      (leaf: WorkspaceLeaf) => new QuillView(leaf, this)
    );

    // RIBBON AND COMMANDS

    // App icon
    this.addRibbonIcon(
      APP_PROPS.appIcon,
      APP_PROPS.appName,
      (evt: MouseEvent) => {
        this.toggleView();
      }
    );

    // Show Quill view command
    this.addCommand({
      id: "show-quill",
      name: "Show Quill",
      callback: () => {
        this.toggleView();
      },
    });

    // Open modal to get prompt
    this.addCommand({
      id: "new-prompt",
      name: "New prompt",
      callback: async () => {
        this.toggleView();
        this.openModalPrompt({
          featureId: "newPrompt",
          outputTarget: "view",
        });
      },
    });

    // Send selected text with instruction from modal
    this.addCommand({
      id: "send-text-with-prompt",
      name: "Send selected text with my prompt",
      editorCheckCallback: (checking: boolean, editor: Editor) => {
        const selectedText = editor.getSelection().trim();
        if (selectedText) {
          if (!checking) {
            this.toggleView();
            this.openModalPrompt({
              featureId: "sendPromptWithSelectedText",
              selectedText: selectedText,
              outputTarget: "view",
            });
          }
          return true;
        }
        return false;
      },
    });

    // CUSTOM COMMANDS ========================================================
    // "New Command" command
    this.addCommand({
      id: "new-command",
      name: "New Command",
      callback: async () => {
        const modal = new ModalCustomCommand(
          this.app,
          this.settings,
          this.pluginServices,
          async (id: string, command: Command) => {
            this.settings.commands[id] = command;
            await this.saveSettings();
            await this.loadCommands();
          }
        );
        modal.open();
      },
    });
    await this.loadCommands();
  }

  openModalPrompt({
    featureId,
    command,
    customCommandId,
    selectedText,
    outputTarget = "view",
  }: {
    featureId: string;
    command?: Command;
    customCommandId?: string;
    selectedText?: string;
    outputTarget?: OutputTarget;
  }): void {
    const modal = new ModalPrompt({
      app: this.app,
      settings: this.settings,
      pluginServices: this.pluginServices,
      onSend: async (userEntry) => {
        await this.features.executeFeature({
          id: featureId,
          inputText: userEntry || "",
          command: command || undefined,
          selectedText: selectedText || undefined,
          outputTarget: outputTarget || "view",
        });
      },
      command: command || undefined,
      customCommandId: customCommandId || undefined,
    });
    this.openModals.push(modal);
    modal.open();
  }

  // VIEW ========================================================
  // TODO: Add activate and deactivate, and then use them in the toggleView method
  viewIsActive = false;

  async toggleView(): Promise<void> {
    const { workspace } = this.app;
    let leaf: WorkspaceLeaf | null =
      workspace.getLeavesOfType(QUILL_VIEW_TYPE)[0];

    if (!leaf) {
      leaf = workspace.getRightLeaf(false);
    }

    if (leaf) {
      await leaf.setViewState({
        type: QUILL_VIEW_TYPE,
        active: true,
      });
      workspace.revealLeaf(leaf);
      const chatViewContainer = leaf.view.containerEl
        .children[1] as HTMLElement;
      chatViewContainer.tabIndex = 0;
      chatViewContainer.focus();
      const chatViewInput = chatViewContainer?.querySelector("textarea");
      chatViewInput?.focus();
    } else {
      this.notifyError("viewError");
    }
  }

  getViewElem(): HTMLElement | null {
    const leaf = this.app.workspace.getLeavesOfType(QUILL_VIEW_TYPE)[0];
    if (leaf) {
      return leaf.view.containerEl;
    }
    return null;
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(QUILL_VIEW_TYPE);
    this.openModals.forEach((modal) => modal.close());
    this.openModals = [];
  }

  // CUSTOM COMMAND LOADER ====================================================
  // Loads the user-created custom commands defined in the settings
  loadCommands = async () => {
    const commands: Commands = this.settings.commands;
    for (const commandId in commands) {
      const command = commands[commandId];

      let callback: (() => void) | undefined = undefined;

      // TODO: Get the basic stuff done first before handling selected text
      // let editorCheckCallback:
      // 	| ((checking: boolean, editor: Editor) => boolean)
      // 	| undefined = undefined;
      // selectedText: command.sendSelectedText --- THIS SHOULD GO UNDER editorCheckCallback
      // 	? this.app.workspace
      // 			.getActiveViewOfType(Editor)
      // 			.getSelection()
      // 	: undefined,

      let cmdEditorCheckCallback:
        | ((checking: boolean, editor: Editor) => void)
        | undefined = undefined;

      switch (command.target) {
        case "editor": {
          const featureId = "customCommandToEditor";
          cmdEditorCheckCallback = async (
            checking: boolean,
            editor: Editor
          ) => {
            if (!checking) {
              if (command.prompt) {
                this.openModalPrompt({
                  featureId: featureId,
                  command: command,
                  customCommandId: commandId,
                  outputTarget: editor,
                });
              } else {
                await this.features.executeFeature({
                  id: featureId,
                  command: command,
                  outputTarget: editor,
                });
              }
            }
          };
          break;
        }
        case "view": {
          const featureId = "customCommandToView";
          callback = async () => {
            this.toggleView();
            if (command.prompt) {
              this.openModalPrompt({
                featureId: featureId,
                command: command,
                customCommandId: commandId,
                outputTarget: "view",
              });
            } else {
              await this.features.executeFeature({
                id: featureId,
                command: command,
                outputTarget: "view",
              });
            }
          };
          break;
        }
      }

      this.addCommand({
        id: commandId,
        name: command.name,
        editorCheckCallback: cmdEditorCheckCallback,
        callback: callback,
      });
    }
  };

  // SETTINGS AND DATA STORAGE
  // Loads the default settings, and then overrides them with
  // any saved settings
  async loadSettings(): Promise<void> {
    const userSettings = await this.loadData();
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...userSettings,
    };
  }

  // Saves the current settings to the local storage
  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  // Open Quill settings tab
  async openPluginSettings(): Promise<void> {
    // Thanks to the community
    // https://discord.com/channels/686053708261228577/840286264964022302/1091000197645090856
    const tabId = this.manifest.id;
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: 'setting' does not exist on type 'App'.
      const settingsPanel = this.app.setting;
      settingsPanel.open();
      if (settingsPanel.lastTabId !== tabId) {
        settingsPanel.openTabById(tabId);
      }
    } catch (e) {
      new Notice(
        "There was a problem opening settings. Navigate to\n\n" +
          " » Settings > Quill\n\nto update your preferences.",
        0
      );
      console.log("Not able to open Quill Settings", e);
    }
  }

  // MISCELLANEOUS
  notifyError(errorCode: ErrorCode, consoleMsg?: string): void {
    const errorMessage = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.unknown;
    new Notice(errorMessage);
    if (consoleMsg) {
      console.error(consoleMsg);
    }
  }
}
