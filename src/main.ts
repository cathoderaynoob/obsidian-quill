import { Editor, Modal, Notice, Plugin, WorkspaceLeaf } from "obsidian";
import {
  ErrorCode,
  APP_PROPS,
  ELEM_CLASSES_IDS,
  ERROR_MESSAGES,
  QUILL_VIEW_TYPE,
} from "@/constants";
import {
  DEFAULT_SETTINGS,
  QuillPluginSettings,
  QuillSettingsTab,
} from "@/settings";
import {
  Command,
  Commands,
  IPluginServices,
  OpenAIModel,
  OutputTarget,
} from "@/interfaces";
import ApiService from "@/ApiService";
import DefaultFolderUtils from "@/DefaultFolderUtils";
import Features from "@/Features";
import ModalCustomCommand from "@/components/ModalCustomCommand";
import ModalPrompt from "@/components/ModalPrompt";
import QuillView from "@/components/view";

type OpenModalPromptParams = {
  featureId: string;
  outputTarget: OutputTarget;
  command?: Command;
  customCommandId?: string;
  editor?: Editor;
  selectedText?: string;
};

export default class QuillPlugin extends Plugin implements IPluginServices {
  settings: QuillPluginSettings;
  apiService: ApiService;
  features: Features;
  pluginServices: IPluginServices;
  openModals: Modal[] = [];
  isSupportedModel(modelId: string, suppressNotify?: boolean): boolean {
    return this.apiService.isSupportedModel(modelId, suppressNotify);
  }
  getModelById(modelId: string): OpenAIModel | undefined {
    return this.apiService.getModelById(modelId);
  }

  async onload(): Promise<void> {
    await this.loadSettings();
    this.apiService = new ApiService(this, this.settings);
    this.features = new Features(this.app, this.apiService, this.settings);
    this.pluginServices = {
      app: this.app,
      activateView: this.activateView,
      getViewElem: this.getViewElem,
      notifyError: this.notifyError,
      saveSettings: this.saveSettings,
      openPluginSettings: this.openPluginSettings,
      loadCommands: this.loadCommands,
      isSupportedModel: this.apiService.isSupportedModel,
      getModelById: this.apiService.getModelById,
    };
    const { hasValidDefaultFolder, promptMissingTemplateFolder } =
      DefaultFolderUtils.getInstance(this.pluginServices, this.settings);

    this.addSettingTab(
      new QuillSettingsTab(this.app, this, this.pluginServices)
    );
    this.registerView(
      QUILL_VIEW_TYPE,
      (leaf: WorkspaceLeaf) => new QuillView(leaf, this)
    );

    // RIBBON AND COMMANDS

    // App icon
    this.addRibbonIcon(APP_PROPS.appIcon, APP_PROPS.appName, () => {
      this.activateView();
    });

    // Show Quill view command
    this.addCommand({
      id: "show-quill",
      name: "Show Quill",
      callback: () => {
        this.activateView();
      },
    });

    // Start new Conversation
    this.addCommand({
      id: "new-convo",
      name: "New conversation",
      callback: async () => {
        this.activateView();
        if (QuillView.instance?.messagesApi) {
          await QuillView.instance.messagesApi.startNewConvo();
        }
      },
    });

    // Open modal to get prompt
    this.addCommand({
      id: "new-prompt",
      name: "Open prompt",
      callback: async () => {
        this.activateView();
        this.openModalPrompt({
          featureId: "openPrompt",
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
        if (checking) {
          if (!selectedText) return false;
        } else {
          this.activateView();
          this.openModalPrompt({
            featureId: "sendPromptWithSelectedText",
            selectedText: selectedText,
            outputTarget: "view",
          });
        }
        return true;
      },
    });

    // CUSTOM COMMANDS ========================================================
    // "New Command" command
    this.addCommand({
      id: "new-command",
      name: "Create new command",
      callback: async () => {
        let isTemplateFolderSet = false;
        isTemplateFolderSet = await hasValidDefaultFolder("templates");
        if (isTemplateFolderSet) {
          const modal = new ModalCustomCommand(
            this.pluginServices,
            this.settings,
            async (id: string, command: Command) => {
              this.settings.commands[id] = command;
              await this.saveSettings();
              await this.loadCommands();
            }
          );
          this.openModals.push(modal);
          modal.open();
        } else {
          promptMissingTemplateFolder();
        }
      },
    });
    await this.loadCommands();
  }

  openModalPrompt({
    featureId,
    outputTarget,
    command,
    customCommandId,
    editor,
    selectedText = "",
  }: OpenModalPromptParams): void {
    const modal = new ModalPrompt({
      settings: this.settings,
      pluginServices: this.pluginServices,
      featureId,
      outputTarget,
      command,
      customCommandId,
      onSend: async (userEntry) => {
        await this.features.executeFeature({
          inputText: userEntry || "",
          featureId,
          outputTarget,
          editor,
          command,
          selectedText,
        });
      },
    });

    this.openModals.push(modal);
    modal.open();
  }

  // VIEW =====================================================================
  activateView = async (): Promise<void> => {
    const { workspace } = this.app;
    let leaf = this.getActiveLeaf();

    if (!leaf) {
      leaf = workspace.getRightLeaf(false);
      if (!leaf) {
        this.notifyError("viewError");
        return;
      }

      try {
        await leaf.setViewState({
          type: QUILL_VIEW_TYPE,
          active: true,
        });
      } catch (e) {
        leaf.detach();
        this.notifyError("viewError", e);
      }
    }
    workspace.revealLeaf(leaf);

    const promptElem = document.querySelector(
      `.${ELEM_CLASSES_IDS.promptInput}`
    ) as HTMLElement;
    promptElem?.focus();
  };

  getActiveLeaf(): WorkspaceLeaf | null {
    const leaf = this.app.workspace.getLeavesOfType(QUILL_VIEW_TYPE).first();
    if (leaf && leaf.view instanceof QuillView) {
      return leaf;
    }
    leaf?.detach();
    return null;
  }

  getViewElem = (): HTMLElement | null => {
    const leaf = this.getActiveLeaf();
    if (!leaf) return null;
    return leaf.view.containerEl;
  };

  onunload(): void {
    this.app.workspace.detachLeavesOfType(QUILL_VIEW_TYPE);
    this.openModals.forEach((modal) => modal.close());
    this.openModals = [];
  }

  // CUSTOM COMMAND LOADER ====================================================
  // Loads the user-created custom commands defined in the settings
  loadCommands = async () => {
    const { validateTemplateFile } = DefaultFolderUtils.getInstance(
      this.pluginServices,
      this.settings
    );
    const commands: Commands = this.settings.commands;

    for (const commandId in commands) {
      const command = commands[commandId];
      let callback: (() => void) | undefined = undefined;
      let cmdEditorCheckCallback:
        | ((checking: boolean, editor: Editor) => boolean | void)
        | undefined = undefined;

      const commandIsValid = async (command: Command) => {
        if (!this.apiService.isSupportedModel(command.modelId)) return false;
        if (!(await validateTemplateFile(command.templateFilename)))
          return false;
        return true;
      };

      const executeCommand = async (
        command: Command,
        featureId: string,
        outputTarget: OutputTarget,
        editor?: Editor,
        selectedText?: string
      ) => {
        if (outputTarget === "view") this.activateView();

        if (command.prompt) {
          this.openModalPrompt({
            featureId,
            command,
            customCommandId: commandId,
            outputTarget,
            editor,
            selectedText,
          });
        } else {
          await this.features.executeFeature({
            featureId,
            command,
            outputTarget,
            editor,
            selectedText,
          });
        }
      };

      if (command.target === "editor") {
        const featureId = "customCommandToEditor";
        cmdEditorCheckCallback = (checking: boolean, editor: Editor) => {
          const selectedText = editor.getSelection().trim();
          if (checking) {
            if (command.sendSelectedText && !selectedText) return false;
          } else {
            (async () => {
              if (await commandIsValid(command)) {
                await executeCommand(
                  command,
                  featureId,
                  "editor",
                  editor,
                  selectedText
                );
              }
            })();
          }
          return true;
        };
      }

      if (command.target === "view") {
        const featureId = "customCommandToView";
        if (command.sendSelectedText) {
          cmdEditorCheckCallback = (checking: boolean, editor: Editor) => {
            const selectedText = editor.getSelection().trim();
            if (checking) {
              if (!selectedText) return false;
            } else {
              (async () => {
                if (await commandIsValid(command)) {
                  await executeCommand(
                    command,
                    featureId,
                    "view",
                    undefined,
                    selectedText
                  );
                }
              })();
            }
            return true;
          };
        } else {
          callback = async () => {
            if (await commandIsValid(command)) {
              await executeCommand(command, featureId, "view");
            }
          };
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
  saveSettings = async (): Promise<void> => {
    await this.saveData(this.settings);
  };

  // Open Quill settings tab
  openPluginSettings = async (): Promise<void> => {
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
        "There was a problem opening settings.\n" +
          "To update your preferences, go to:\n\n" +
          "    Settings > Quill",
        10000
      );
      console.log("Not able to open Quill Settings", e);
    }
  };

  // MISCELLANEOUS
  notifyError = (errorCode: ErrorCode, consoleMsg?: string): void => {
    const errorMessage = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.unknown;
    new Notice(errorMessage);
    if (consoleMsg) {
      console.error(consoleMsg);
    }
  };
}
