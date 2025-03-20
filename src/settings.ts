import {
  App,
  DropdownComponent,
  Notice,
  PluginSettingTab,
  Setting,
} from "obsidian";
import { APP_PROPS, ELEM_CLASSES_IDS } from "@/constants";
import { Command, Commands, IPluginServices } from "@/interfaces";
import QuillPlugin from "@/main";
import VaultUtils from "@/VaultUtils";
import ModalConfirm from "@/components/ModalConfirm";
import ModalCustomCommand from "@/components/ModalCustomCommand";

// Export the settings interface
export interface QuillPluginSettings {
  openaiApiKey: string;
  openaiModel: string;
  openaiTemperature: number;
  autoSaveConvos: boolean;
  pathConversations: string;
  pathMessages: string;
  pathTemplates: string;
  openAfterSave: boolean;
  commands: Commands;
}

// Export the default settings
export const DEFAULT_SETTINGS: QuillPluginSettings = {
  openaiApiKey: "",
  openaiModel: "gpt-4o",
  openaiTemperature: 0.7,
  autoSaveConvos: false,
  pathConversations: `${APP_PROPS.appName}/Conversations`,
  pathMessages: `${APP_PROPS.appName}/Messages`,
  pathTemplates: `${APP_PROPS.appName}/Templates`,
  openAfterSave: false,
  commands: {},
};

interface OpenAIModels {
  user: {
    model: string;
    display: string;
  }[];
}

export const OPENAI_MODELS: OpenAIModels = {
  user: [
    {
      model: "gpt-4o",
      display: "GPT-4o",
    },
    {
      model: "gpt-4o-mini",
      display: "GPT-4o Mini",
    },
  ],
};

export class QuillSettingsTab extends PluginSettingTab {
  private plugin: QuillPlugin;
  private pluginServices: IPluginServices;

  constructor(app: App, plugin: QuillPlugin, pluginServices: IPluginServices) {
    super(app, plugin);
    this.plugin = plugin;
    this.pluginServices = pluginServices;
  }

  private closeSettings(): void {
    // I can't find anything in the api to close the Settings panel
    const escKeyEvent = new KeyboardEvent("keydown", {
      key: "Escape",
      code: "Escape",
      bubbles: true,
    });
    document.dispatchEvent(escKeyEvent);
  }

  display(): void {
    const { containerEl } = this;
    const settings = this.plugin.settings;
    const defaultConversationsPath = DEFAULT_SETTINGS.pathConversations;
    const defaultMessagesPath = DEFAULT_SETTINGS.pathMessages;
    const defaultTemplatesPath = DEFAULT_SETTINGS.pathTemplates;
    const vaultUtils = VaultUtils.getInstance(this.pluginServices, settings);
    containerEl.setAttr("id", "oq-settings");
    containerEl.empty();

    const validateHasValue = async (
      settingEl: Setting,
      value: string
    ): Promise<void> => {
      !value
        ? settingEl.controlEl.addClass(ELEM_CLASSES_IDS.validationEmpty)
        : settingEl.controlEl.removeClass(ELEM_CLASSES_IDS.validationEmpty);
    };

    const addDefaultFolderDropdownOptions = (
      dropdown: DropdownComponent,
      defaultFolderPath?: string
    ): void => {
      const folderPaths = vaultUtils.getAllFolderPaths();
      if (defaultFolderPath && !folderPaths.contains(defaultFolderPath)) {
        dropdown.addOption(defaultFolderPath, `${defaultFolderPath} (default)`);
      }
      folderPaths.forEach((folderPath) => {
        if (!!defaultFolderPath || folderPath !== defaultFolderPath) {
          dropdown.addOption(folderPath, folderPath);
        }
      });
    };

    this.containerEl.createEl("h3", {
      text: "Obsidian Quill",
    });

    // OpenAI =================================================================
    this.containerEl.createEl("h4", {
      text: "OpenAI",
    });
    // OpenAI API Key
    const apikeySetting = new Setting(containerEl)
      .setName("OpenAI API Key")
      .setDesc("Enter your OpenAI API key.")
      .addText((text) => {
        text
          .setPlaceholder("Enter your key")
          .setValue(settings.openaiApiKey)
          .onChange(async (value) => {
            settings.openaiApiKey = value;
            await validateHasValue(apikeySetting, settings.openaiApiKey);
          });
        text.inputEl.onfocus = async () => {
          await validateHasValue(apikeySetting, settings.openaiApiKey);
        };
        text.inputEl.onblur = async () => {
          await this.pluginServices.saveSettings();
        };
      });

    // OpenAI Model
    new Setting(containerEl)
      .setName("OpenAI Model")
      .setDesc(
        "Set the default model for Quill commands. (Some commands will " +
          "use a different model tailored to their specific purpose.)"
      )
      .addDropdown((dropdown) => {
        OPENAI_MODELS.user.forEach((model) =>
          dropdown.addOption(model.model, model.display)
        );
        dropdown.setValue(settings.openaiModel);
        dropdown.onChange(async (model) => {
          settings.openaiModel = model;
          await this.pluginServices.saveSettings();
          this.display();
        });
      });

    // Saving Conversations and Messages =======================================================
    this.containerEl.createEl("h4", {
      text: "Saving Conversations and Messages",
    });
    // Save Conversations Automatically
    new Setting(containerEl)
      .setName("Save Conversations Automatically")
      .setDesc("Save each conversation to a note automatically")
      .addToggle((toggle) => {
        toggle.setValue(settings.autoSaveConvos);
        toggle.onChange(async () => {
          settings.autoSaveConvos = toggle.getValue();
          await this.pluginServices.saveSettings();
        });
      });

    // Save Conversations To...
    new Setting(containerEl)
      .setName("Save Conversations To...")
      .setDesc("Choose the default folder for saved conversations.")
      .addDropdown((dropdown) => {
        addDefaultFolderDropdownOptions(dropdown, defaultConversationsPath);
        dropdown.setValue(
          vaultUtils.getFolderByPath(settings.pathConversations, true)
            ? settings.pathConversations
            : defaultConversationsPath
        );
        dropdown.onChange(async (folder) => {
          settings.pathConversations = folder;
          await this.pluginServices.saveSettings();
        });
      });

    // Save Messages Preferences
    new Setting(containerEl)
      .setName("Save Messages To...")
      .setDesc("Choose the default folder for saving individual messages.")
      .addDropdown((dropdown) => {
        addDefaultFolderDropdownOptions(dropdown, defaultMessagesPath);
        dropdown.setValue(
          vaultUtils.getFolderByPath(settings.pathMessages, true)
            ? settings.pathMessages
            : defaultMessagesPath
        );
        dropdown.onChange(async (folder) => {
          settings.pathMessages = folder;
          await this.pluginServices.saveSettings();
        });
      });

    // Custom Commands ========================================================
    new Setting(containerEl)
      .setName("My Custom Commands")
      .setClass("oq-settings-section-title")
      .setDesc(
        "Each custom command is a combination of a template note and a " +
          "command definition."
      );
    const commandTemplateSetting = new Setting(containerEl)
      .setName("Command Templates")
      .setDesc(
        "Store all your command templates in the folder selected here. " +
          "To add a new command, first create a note in the templates folder. " +
          "The note may contain template structure, instruction, and " +
          "any other information you find most effective for the desired response."
      )
      // Command Template Folder ------------------------------------------------
      .addDropdown((dropdown) => {
        addDefaultFolderDropdownOptions(dropdown, defaultTemplatesPath);
        dropdown.setValue(
          vaultUtils.getFolderByPath(settings.pathTemplates, true)
            ? settings.pathTemplates
            : defaultTemplatesPath
        );
        dropdown.onChange(async (folder) => {
          settings.pathTemplates = folder;
          await this.pluginServices.saveSettings();
          this.display();
        });
      });

    // Open Templates Folder
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: Property 'internalPlugins' does not exist on type 'App'.
    const expl = this.app.internalPlugins.getEnabledPluginById("file-explorer");
    // Only show the button if the plugin is available
    if (expl) {
      commandTemplateSetting.addExtraButton((button) => {
        button
          .setIcon(APP_PROPS.folderIcon)
          .setTooltip("Open folder")
          .onClick(async () => {
            const folder = vaultUtils.getFolderByPath(
              settings.pathTemplates,
              true
            );
            if (folder) {
              try {
                expl.revealInFolder(folder);
                this.closeSettings();
              } catch (error) {
                new Notice(`Error opening folder.`);
                console.error("Error opening templates folder:", error);
              }
            }
          });
      });
    }

    // Add New Custom Command
    new Setting(containerEl)
      .setName("Command Definitions")
      .setDesc(
        "Have a template ready? Next, create a custom command to use it."
      )
      .addButton((button) => {
        button.setButtonText("New Custom Command").onClick(async () => {
          new ModalCustomCommand(
            this.app,
            settings,
            this.pluginServices,
            async (id: string, command: Command) => {
              settings.commands[id] = command;
              await this.pluginServices.saveSettings();
              await this.pluginServices.loadCommands();
              new Notice(
                `New command created:\n\n » ${command.name}\n\n ` +
                  `It should now appear in the list below.`
              );
              this.display();
            }
          ).open();
        });
      });

    // Custom Commands List ---------------------------------------------------
    const commands = settings.commands;

    const sortedCommands = Object.keys(commands)
      .map((commandId) => ({ id: commandId, ...commands[commandId] }))
      .sort((a, b) => a.name.localeCompare(b.name));

    sortedCommands.forEach((command) => {
      const hasTemplateFile = !!vaultUtils.getFileByPath(
        `${settings.pathTemplates}/${command.templateFilename}`,
        true
      );
      const templateIcon = hasTemplateFile
        ? APP_PROPS.fileIcon
        : APP_PROPS.fileMissingIcon;
      const tooltip = hasTemplateFile
        ? `Open "${command.templateFilename}"`
        : `Template file not found.\nEdit command to assign one.`;

      const modelString = command.model || `(${settings.openaiModel})`;
      const targetString = command.target === "view" ? "Conversation" : "Note";
      const promptString = command.prompt ? "+ Prompt" : "";

      new Setting(containerEl)
        .setName(command.name)
        .setDesc(`${modelString} » ${targetString} ${promptString}`)
        .setClass("oq-settings-custom-command")
        // Open Template File
        .addExtraButton((button) => {
          const openTemplateButton = button
            .setIcon(templateIcon)
            .setTooltip(tooltip);
          if (hasTemplateFile)
            openTemplateButton.onClick(async () => {
              const filePath = `${settings.pathTemplates}/${command.templateFilename}`;
              if (vaultUtils.getFileByPath(filePath)) {
                const opened = await vaultUtils.openFile(
                  `${settings.pathTemplates}/${command.templateFilename}`,
                  true
                );
                if (opened) this.closeSettings();
              }
            });
        })
        // Edit Command
        .addExtraButton((button) =>
          button
            .setIcon(APP_PROPS.editIcon)
            .setTooltip("Edit")
            .onClick(async () => {
              new ModalCustomCommand(
                this.app,
                settings,
                this.pluginServices,
                async (id: string, command: Command) => {
                  settings.commands[id] = command;
                  await this.pluginServices.saveSettings();
                  await this.pluginServices.loadCommands();
                  this.display();
                  new Notice(`Updated command:\n\n » ${command.name}`);
                },
                command.id
              ).open();
            })
        )
        // Delete Command
        .addExtraButton((button) =>
          button
            .setIcon(APP_PROPS.trashIcon)
            .onClick(async () => {
              new ModalConfirm(
                this.app,
                `Delete Custom Command`,
                `Are you sure you want to permanently delete this command?` +
                  `<span class="oq-confirm-cmdname">${command.name}</span>` +
                  `The template file will remain in your vault.`,
                "Delete",
                true,
                async () => {
                  delete commands[command.id];
                  await this.pluginServices.saveSettings();
                  this.plugin.removeCommand(command.id);
                  this.display(); // Refresh the list
                  new Notice(`Deleted command:\n\n » ${command.name}`);
                }
              ).open();
            })
            .setTooltip("Delete...")
        );
    });
  }
}
