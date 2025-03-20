import {
  App,
  DropdownComponent,
  Notice,
  PluginSettingTab,
  Setting,
  setTooltip,
  TFolder,
} from "obsidian";
import { APP_PROPS, ELEM_CLASSES_IDS, OPENAI_MODELS } from "@/constants";
import {
  Command,
  Commands,
  DefaultSaveFolder,
  folderSettingNames,
  IPluginServices,
} from "@/interfaces";
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

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore: Property 'internalPlugins' does not exist on type 'App'.
  private xplr = this.app.internalPlugins.getEnabledPluginById("file-explorer");

  display(): void {
    const { containerEl } = this;
    const settings = this.plugin.settings;
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

    const getDefaultFolderInfo = (folderType: DefaultSaveFolder) => {
      const folderMapping: Record<
        DefaultSaveFolder,
        {
          pluginDefaultPath: string;
          userDefaultPath: string;
          settingName: folderSettingNames;
        }
      > = {
        conversations: {
          pluginDefaultPath: DEFAULT_SETTINGS.pathConversations,
          userDefaultPath: settings.pathConversations,
          settingName: "pathConversations",
        },
        messages: {
          pluginDefaultPath: DEFAULT_SETTINGS.pathMessages,
          userDefaultPath: settings.pathMessages,
          settingName: "pathMessages",
        },
        templates: {
          pluginDefaultPath: DEFAULT_SETTINGS.pathTemplates,
          userDefaultPath: settings.pathTemplates,
          settingName: "pathTemplates",
        },
      };
      return folderMapping[folderType];
    };

    const createDefaultFolderDropdown = (
      dropdown: DropdownComponent,
      folderType: DefaultSaveFolder
    ): void => {
      const { pluginDefaultPath, userDefaultPath, settingName } =
        getDefaultFolderInfo(folderType);
      const vaultFolderPaths = vaultUtils.getAllFolderPaths();
      const hasUserSetDefault = userDefaultPath !== "";
      const pluginDefaultExists = vaultFolderPaths.contains(pluginDefaultPath);

      // If the plugin default folders exist but the user hasn't chosen a default
      // yet, set it to the plugin default for them. This preps for the next step
      if (!hasUserSetDefault && pluginDefaultExists) {
        settings[settingName] = pluginDefaultPath;
        this.pluginServices.saveSettings();
      }
      // Determine options to show and which one to select
      const shouldShowPluginDefault = !!(pluginDefaultPath && !userDefaultPath);
      const pathToSelect = !hasUserSetDefault
        ? // if no user default set, select plugin default
          pluginDefaultPath
        : // does the user default folder exist?
        vaultFolderPaths.contains(userDefaultPath)
        ? // yes, select it
          userDefaultPath
        : // no, select the menu "placeholder" option
          "";
      if (pathToSelect === "") {
        dropdown.selectEl.createEl("option", {
          text: "Your default folder not found...",
          attr: {
            value: "",
            disabled: "disabled",
          },
        });
        setTooltip(
          dropdown.selectEl,
          `Unable to find your default folder:\n"${userDefaultPath}"\n` +
            `Select another, or find and restore your default.`,
          {
            placement: "top",
          }
        );
      }
      if (shouldShowPluginDefault) {
        if (!vaultUtils.getFolderByPath(pluginDefaultPath, true)) {
          dropdown.addOption(
            pluginDefaultPath,
            `${pluginDefaultPath} (Quill default)`
          );
          dropdown.selectEl.toggleClass(
            ELEM_CLASSES_IDS.menuDefault,
            shouldShowPluginDefault
          );
        }
      }
      vaultFolderPaths.forEach((folderPath) => {
        if (!!pluginDefaultPath || folderPath !== pluginDefaultPath) {
          dropdown.addOption(folderPath, folderPath);
        }
      });
      dropdown.setValue(pathToSelect);
      dropdown.selectEl.toggleClass("oq-disabled", pathToSelect === "");

      dropdown.onChange(async (folder) => {
        settings[settingName] = folder;
        await this.pluginServices.saveSettings();
        this.display();
      });
    };

    const addOpenFolderButton = (
      setting: Setting,
      folderType: DefaultSaveFolder
    ): TFolder | null => {
      const { pluginDefaultPath, userDefaultPath, settingName } =
        getDefaultFolderInfo(folderType);
      if (!this.xplr) return null;

      const folderToOpen =
        settings[settingName] === "" ? pluginDefaultPath : userDefaultPath;
      const folder = vaultUtils.getFolderByPath(folderToOpen, true);
      const { icon, tooltip, purpose, btnClass } = getButtonProps(
        userDefaultPath,
        pluginDefaultPath
      );

      setting.addExtraButton((button) => {
        button.setIcon(icon).setTooltip(tooltip, { placement: "top" });
        if (btnClass) button.extraSettingsEl.addClass(btnClass);

        switch (purpose) {
          case "open":
            button.onClick(async () => {
              if (!folder) return;
              try {
                this.xplr.revealInFolder(folder);
                this.closeSettings();
              } catch (error) {
                new Notice("Error opening folder.");
                console.error(`Error opening ${folderType} folder:`, error);
              }
            });
            break;
          case "create":
            button.onClick(async () => {
              try {
                await vaultUtils.createFolder(folderToOpen);
                settings[settingName] = folderToOpen;
                await this.pluginServices.saveSettings();
                this.display();
                new Notice(
                  `Folder created successfully and\nset to default:\n\n"${folderToOpen}"`
                );
              } catch (e) {
                this.pluginServices.notifyError("folderCreateError", e);
              }
            });
            break;
          default:
            // "warn" case
            button.extraSettingsEl.addClass(ELEM_CLASSES_IDS.btnWarn);
        }
      });
      return folder || null;
    };

    // Helper function to determine button properties
    const getButtonProps = (
      settingsPath: string,
      defaultPath: string
    ): {
      icon: string;
      tooltip: string;
      purpose: "create" | "open" | "warn";
      btnClass?: string;
    } => {
      const folderPath = settingsPath || defaultPath;
      const folderExists = vaultUtils.getFolderByPath(folderPath, true);

      if (!folderExists) {
        if (settingsPath === "") {
          // User has not chosen a folder, and the default folder is missing
          return {
            icon: APP_PROPS.folderAddIcon,
            tooltip: `Create folder\n"${defaultPath}"`,
            purpose: "create",
            btnClass: ELEM_CLASSES_IDS.btnAction,
          };
        } else {
          // User has chosen a folder, but it is missing
          return {
            icon: APP_PROPS.folderMissingIcon,
            tooltip: `Folder is missing:\n"${settingsPath}"`,
            purpose: "warn",
            btnClass: ELEM_CLASSES_IDS.btnWarn,
          };
        }
      }

      // Folder exists
      return {
        icon: APP_PROPS.folderOpenIcon,
        tooltip: `Open folder\n"${folderPath}"`,
        purpose: "open",
      };
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

    // Saving Conversations and Messages ======================================
    this.containerEl.createEl("h4", {
      text: "Saving Conversations and Messages",
    });
    // Save Conversations Automatically
    new Setting(containerEl)
      .setName("Save Conversations Automatically")
      .setDesc("Save each conversation to a note automatically.")
      .addToggle((toggle) => {
        toggle.setValue(settings.autoSaveConvos);
        toggle.onChange(async () => {
          settings.autoSaveConvos = toggle.getValue();
          await this.pluginServices.saveSettings();
        });
      });

    // Save Conversations To...
    const conversationsFolderSetting = new Setting(containerEl)
      .setName("Save Conversations To...")
      .setDesc("Choose the default folder for saved conversations.")
      .addDropdown((dropdown) =>
        createDefaultFolderDropdown(dropdown, "conversations")
      );

    addOpenFolderButton(conversationsFolderSetting, "conversations");

    // Save Messages Preferences
    const messagesFolderSetting = new Setting(containerEl)
      .setName("Save Messages To...")
      .setDesc("Choose the default folder for saving individual messages.")
      .addDropdown((dropdown) =>
        createDefaultFolderDropdown(dropdown, "messages")
      );

    addOpenFolderButton(messagesFolderSetting, "messages");

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
      .addDropdown((dropdown) =>
        createDefaultFolderDropdown(dropdown, "templates")
      );

    const templateFolder = addOpenFolderButton(
      commandTemplateSetting,
      "templates"
    );

    // Add New Custom Command -------------------------------------------------
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
        const hasTemplateFolder = templateFolder
          ? true
          : settings.pathTemplates === ""
          ? true
          : false;
        if (!hasTemplateFolder) {
          button.setDisabled(!hasTemplateFolder);
          button.setTooltip("Select your default Templates folder above", {
            placement: "top",
          });
        }
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
              const filePath =
                settings.pathTemplates + "/" + command.templateFilename;
              if (vaultUtils.getFileByPath(filePath)) {
                const opened = await vaultUtils.openFile(
                  `${settings.pathTemplates}/${command.templateFilename}`,
                  true
                );
                if (opened) this.closeSettings();
              }
            });
          openTemplateButton.extraSettingsEl.toggleClass(
            "oq-warn-button",
            !hasTemplateFile
          );
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
