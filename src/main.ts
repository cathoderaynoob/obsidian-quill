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
    };

    this.addSettingTab(new QuillSettingsTab(this.app, this));
    this.registerView(
      QUILL_VIEW_TYPE,
      (leaf: WorkspaceLeaf) => new QuillView(leaf, this)
    );

    // QUILL COMMANDS	========================================================
    // This works but is not in the public API
    // const setting = (this.app as any).setting;
    // setting.open();
    // setting.openTabById("obsidian-quill");
    // this.app.commands.executeCommandById('app:open-settings');
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

    // "Tell me a joke" command
    this.addCommand({
      id: "tell-a-joke",
      name: "Tell me a joke",
      callback: async () => {
        await this.features.executeFeature({
          id: "tellAJoke",
          outputTarget: "modal",
        });
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

    /* Test upload command ====================================================
		// We don't know yet what the filePath will be. Get it from the modal.
		// this.addCommand({
		// 	id: "test-upload",
		// 	name: "Test Upload",
		// 	callback: async () => {
		// 		this.toggleView();
		// 		const modal = new ModalPromptFile({
		// 			app: this.app,
		// 			settings: this.settings,
		// 			onSend: async (userEntry, filePath) => {
		// 				await this.features.executeFeature({
		// 					id: "testUpload",
		// 					inputText: userEntry,
		// 					filePath: filePath,
		// 				});
		// 			},
		// 		});
		// 		this.openModals.push(modal);
		// 		modal.open();
		// 	},
		// });
		   ======================================================================== */

    // CUSTOM COMMANDS ========================================================

    // Command Loader .........................................................
    const commands: Commands = this.settings.commands;
    for (const commandId in commands) {
      const command = commands[commandId];
      console.log(command);

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

      let editorCallback: ((editor: Editor) => void) | undefined = undefined;

      switch (command.target) {
        case "editor": {
          const featureId = "customCommandToEditor";
          editorCallback = async (editor: Editor) => {
            if (command.prompt) {
              this.openModalPrompt({
                featureId: featureId,
                // templateFilename: command.templateFilename,
                command: command,
                outputTarget: editor,
              });
            } else {
              await this.features.executeFeature({
                id: featureId,
                // templateFilename: command.templateFilename,
                command: command,
                outputTarget: editor,
              });
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
                // templateFilename: command.templateFilename,
                command: command,
                outputTarget: "view",
              });
            } else {
              await this.features.executeFeature({
                id: featureId,
                // templateFilename: command.templateFilename || undefined,
                command: command,
                outputTarget: "view",
              });
            }
          };
          break;
        }
        // case: "modal": {
        // 	break;
        // }
      }

      this.addCommand({
        id: commandId,
        name: command.name,
        editorCallback: editorCallback,
        callback: callback,
      });
    }
  }

  openModalPrompt({
    featureId,
    // templateFilename,
    command,
    selectedText,
    outputTarget = "view",
  }: {
    featureId: string;
    command?: Command;
    selectedText?: string;
    outputTarget?: OutputTarget;
  }): void {
    const modal = new ModalPrompt({
      app: this.app,
      settings: this.settings,
      onSend: async (userEntry) => {
        await this.features.executeFeature({
          id: featureId,
          inputText: userEntry || "",
          // templateFilename: templateFilename || undefined,
          command: command || undefined,
          selectedText: selectedText || undefined,
          outputTarget: outputTarget || "view",
        });
      },
    });
    this.openModals.push(modal);
    modal.open();
  }

  // Command Runner ...........................................................
  // executeCustomCommand(command: Command, commandId: string, editor?: Editor) {
  // 	console.log(command);
  // 	switch (command.target) {
  // 		case "editor": {
  // 			if (editor) {
  // 				this.features.executeFeature({
  // 					id: "runCustomCommand",
  // 					outputTarget: editor,
  // 				});
  // 			}
  // 			break;
  // 		}
  // 		case "view": {
  // 			// Implement logic for view target
  // 			this.toggleView();

  // 			const modal = new ModalPromptFile({
  // 				app: this.app,
  // 				settings: this.settings,
  // 				onSend: async (userEntry, templateFilePath) => {
  // 					await this.features.executeFeature({
  // 						id: commandId,
  // 						outputTarget: "view",
  // 						inputText: userEntry,
  // 					});
  // 				},
  // 			});
  // 			this.openModals.push(modal);
  // 			modal.open();
  // 			console.log(`Executing command: ${command.name} in view.`);
  // 			break;
  // 		}
  // 		case "modal": {
  // 			// Implement logic for modal target
  // 			console.log(`Executing command: ${command.name} in modal.`);
  // 			break;
  // 		}
  // 		default: {
  // 			console.error(`Unknown target for command: ${command.name}`);
  // 		}
  // 	}
  // }

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

  // MISCELLANEOUS
  notifyError(errorCode: ErrorCode, consoleMsg?: string): void {
    const errorMessage = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.unknown;
    new Notice(errorMessage);
    if (consoleMsg) {
      console.error(consoleMsg);
    }
  }
}
