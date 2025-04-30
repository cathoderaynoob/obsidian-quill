import {
  App,
  ButtonComponent,
  DropdownComponent,
  Notice,
  PluginSettingTab,
  Setting,
} from "obsidian";
import {
  APP_PROPS,
  ELEM_CLASSES_IDS,
  EXTERNAL_LINKS,
  OPENAI_MODELS,
} from "@/constants";
import {
  Command,
  Commands,
  folderSettingNames,
  IPluginServices,
  OpenAIModelsSupported,
} from "@/interfaces";
import QuillPlugin from "@/main";
import VaultUtils from "@/VaultUtils";
import DefaultFolderUtils from "@/DefaultFolderUtils";
import ModalConfirm from "@/components/ModalConfirm";
import ModalCustomCommand from "@/components/ModalCustomCommand";
const {
  validationEmpty,
  menuPlaceholder,
  menuDefault,
  menuTemplates,
  disabled,
  btnWarn,
  clickableIcon,
} = ELEM_CLASSES_IDS;

// Export the settings interface
export interface QuillPluginSettings {
  openaiApiKey: string;
  openaiModelId: OpenAIModelsSupported;
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
  openaiModelId: "gpt-4o",
  openaiTemperature: 0.7,
  autoSaveConvos: false,
  pathConversations: "",
  pathMessages: "",
  pathTemplates: "",
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
    const escKeyEvent = new KeyboardEvent("keydown", {
      key: "Escape",
      code: "Escape",
      bubbles: true,
    });
    document.dispatchEvent(escKeyEvent);
  }

  private highlightIfEmpty = async (
    settingEl: Setting,
    value: string
  ): Promise<void> => {
    settingEl.controlEl.toggleClass(validationEmpty, !value);
  };

  private createDescWithLink = (
    desc: string,
    linkText: string,
    linkHref: string
  ): DocumentFragment => {
    return createFragment((descEl) => {
      const link = descEl.createEl("a", {
        text: linkText,
        href: linkHref,
      });
      descEl.appendText(desc);
      descEl.append(link);
    });
  };

  display(): void {
    const { getModelById, isSupportedModel, loadCommands, saveSettings } =
      this.pluginServices;
    const { containerEl } = this;
    const settings = this.plugin.settings;
    const vaultUtils = VaultUtils.getInstance(this.pluginServices, settings);
    const {
      addDefaultFolderDropdown,
      addOpenFolderButton,
      validateTemplateFile,
    } = DefaultFolderUtils.getInstance(this.pluginServices, settings);
    containerEl.setAttr("id", "oq-settings");
    containerEl.empty();

    new Setting(containerEl).setName("OpenAI").setHeading();

    // OpenAI API Key
    const apiKeySetting = new Setting(containerEl)
      .setName("API key")
      .addText((text) => {
        text
          .setPlaceholder("Enter your API key")
          .setValue(settings.openaiApiKey)
          .onChange(async (value) => {
            settings.openaiApiKey = value;
            await this.highlightIfEmpty(apiKeySetting, settings.openaiApiKey);
          });
        text.inputEl.onfocus = async () => {
          await this.highlightIfEmpty(apiKeySetting, settings.openaiApiKey);
        };
        text.inputEl.onblur = async () => {
          await saveSettings();
        };
      });

    apiKeySetting.setDesc(
      this.createDescWithLink(
        "Sign up for an OpenAI Platform account to obtain an API key.",
        "OpenAI Platform: API Keys",
        EXTERNAL_LINKS.linkOpenAIMyAPIKeys
      )
    );

    // OpenAI Model
    const modelSetting = new Setting(containerEl)
      .setName("Model")
      .addDropdown((dropdown) => {
        const sortedModels = OPENAI_MODELS.models.sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        sortedModels.forEach((model) =>
          dropdown.addOption(model.id, model.name)
        );
        dropdown.setValue(settings.openaiModelId);
        dropdown.onChange(async (model) => {
          settings.openaiModelId = model;
          await saveSettings();
          this.display();
        });
      });

    modelSetting.setDesc(
      this.createDescWithLink(
        "Choose the default model for generating responses. " +
          "You can override this setting for your individual custom commands.",
        "OpenAI Platform: Models",
        EXTERNAL_LINKS.linkOpenAIAboutModels
      )
    );

    // Section: Saving Conversations and Messages =============================
    const onMenuChange = async (
      dropdown: DropdownComponent,
      folderSetting: folderSettingNames,
      folderPath: string
    ): Promise<void> => {
      dropdown.selectEl.removeClass(menuPlaceholder, menuDefault);
      settings[folderSetting] = folderPath;
      this.display();
      await saveSettings();
    };

    new Setting(containerEl)
      .setName("Save Conversations and Messages")
      .setHeading();
    // Save Conversations Automatically
    new Setting(containerEl)
      .setName("Save conversations automatically")
      .setDesc("Save each conversation to a note automatically.")
      .addToggle((toggle) => {
        toggle.setValue(settings.autoSaveConvos);
        toggle.onChange(async () => {
          settings.autoSaveConvos = toggle.getValue();
          await saveSettings();
        });
      });

    // Save Conversations To...
    new Setting(containerEl)
      .setName("Save conversations to...")
      .setDesc("Choose the default folder for saved conversations.")
      .addDropdown((dropdown) => {
        addDefaultFolderDropdown(
          dropdown,
          "conversations",
          async (folderPath: string) => {
            await onMenuChange(dropdown, "pathConversations", folderPath);
          }
        );
      })
      .addButton((button) => {
        addOpenFolderButton({
          button: button,
          folderType: "conversations",
          folderActionHandler: (action) => {
            if (action === "create") this.display();
            if (action === "open") this.closeSettings();
          },
        });
      });

    // Save Messages Preferences
    new Setting(containerEl)
      .setName("Save messages to...")
      .setDesc("Choose the default folder for saving individual messages.")
      .addDropdown((dropdown) =>
        addDefaultFolderDropdown(
          dropdown,
          "messages",
          async (folderPath: string) => {
            await onMenuChange(dropdown, "pathMessages", folderPath);
          }
        )
      )
      .addButton((button) => {
        addOpenFolderButton({
          button: button,
          folderType: "messages",
          folderActionHandler: (action) => {
            if (action === "create") this.display();
            if (action === "open") this.closeSettings();
          },
        });
      });

    // Section: My Custom Commands ============================================
    new Setting(containerEl)
      .setName("My Custom Commands")
      .setHeading()
      .setDesc(
        "Each custom command is a combination of a template note and a " +
          "command definition."
      );
    new Setting(containerEl)
      .setName("Store command templates in...")
      .setDesc(
        "Store all your command templates in this folder. " +
          "To add a new command, first create a note template here, " +
          "then create a command definition."
      )
      // Command Templates Folder ---------------------------------------------
      .addDropdown((dropdown) => {
        addDefaultFolderDropdown(
          dropdown,
          "templates",
          async (folderPath: string) => {
            await onMenuChange(dropdown, "pathTemplates", folderPath);
          }
        );
        dropdown.selectEl.id = menuTemplates;
      })
      .addButton((button) => {
        addOpenFolderButton({
          button: button,
          folderType: "templates",
          folderActionHandler: (action) => {
            if (action === "create") this.display();
            if (action === "open") this.closeSettings();
          },
        });
      });

    // If templates folder is not specified or is missing, disable
    // buttons that rely on it
    const disableIfNoTemplateFolder = (button: ButtonComponent): void => {
      const menuTemplatesElem = document.getElementById(menuTemplates);
      if (menuTemplatesElem) {
        const menuIsDisabled = menuTemplatesElem.hasClass(disabled);
        button.setDisabled(menuIsDisabled);
        if (menuIsDisabled)
          button.setTooltip("Select a Command Templates folder above.", {
            placement: "top",
          });
        button.buttonEl.toggleClass(disabled, menuIsDisabled);
      }
    };

    // Add New Custom Command -------------------------------------------------
    new Setting(containerEl)
      .setName("Command definitions")
      .setDesc(
        "Have a template ready? Next, create a custom command to use it."
      )
      .addButton((button) => {
        button.setButtonText("New custom command").onClick(async () => {
          new ModalCustomCommand(
            this.pluginServices,
            settings,
            async (id: string, command: Command) => {
              settings.commands[id] = command;
              await saveSettings();
              await loadCommands();
              new Notice(
                `New command created:\n\n    ${command.name}\n\n ` +
                  `It should now appear in the list below.`
              );
              this.display();
            }
          ).open();
        });
        disableIfNoTemplateFolder(button);
      });

    // Custom Commands List ---------------------------------------------------
    const commands = settings.commands;

    const sortedCommands = Object.keys(commands)
      .map((commandId) => ({ id: commandId, ...commands[commandId] }))
      .sort((a, b) => a.name.localeCompare(b.name));

    sortedCommands.forEach(async (command) => {
      // Template file validation
      const hasTemplateFile = await validateTemplateFile(
        command.templateFilename,
        true
      );
      const templateIcon = hasTemplateFile
        ? APP_PROPS.fileIcon
        : APP_PROPS.fileMissingIcon;
      const tooltip = hasTemplateFile
        ? `Open "${command.templateFilename}"`
        : `Template note not found.\nEdit command to assign one.`;

      // Model validation
      const hasValidModel = isSupportedModel(command.modelId, true);

      // Custom command description
      const modelDesc = hasValidModel
        ? getModelById(command.modelId)?.name ||
          `${getModelById(settings.openaiModelId)?.name} (default)`
        : `${command.modelId} (unsupported)`;

      const targetDesc =
        command.target === "view" ? "Conversation" : "Active note";
      const promptDesc = command.prompt ? "| Show prompt" : "";
      const selectedTextDesc = command.sendSelectedText
        ? " | Send selected text"
        : "";

      const customCommand = new Setting(containerEl)
        .setName(command.name)
        .setDesc(
          `${modelDesc} | ${targetDesc} ${promptDesc} ${selectedTextDesc}`
        )
        .setClass("oq-settings-custom-command")
        // Open Template Note
        .addButton((button) => {
          const openTemplateButton = button
            .setIcon(templateIcon)
            .setTooltip(tooltip, {
              placement: "top",
            });
          // If no template folder selected
          disableIfNoTemplateFolder(button);
          // If the template file is missing
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
          openTemplateButton.buttonEl.toggleClass(btnWarn, !hasTemplateFile);
        })
        // Edit Command
        .addButton((button) => {
          const editCommandBtn = button
            .setIcon(APP_PROPS.editIcon)
            .onClick(async () => {
              new ModalCustomCommand(
                this.pluginServices,
                settings,
                async (id: string, command: Command) => {
                  settings.commands[id] = command;
                  await saveSettings();
                  await loadCommands();
                  this.display();
                  new Notice(`Updated command:\n${command.name}`);
                },
                command.id
              ).open();
            });

          // If no template folder selected
          disableIfNoTemplateFolder(button);
          editCommandBtn.setTooltip(
            hasValidModel
              ? "Edit"
              : `Model "${command.modelId}" is no longer supported.\n` +
                  `Edit command...`,
            {
              placement: "top",
            }
          );
          editCommandBtn.buttonEl.toggleClass(btnWarn, !hasValidModel);
        })
        // Delete Command
        .addButton((button) =>
          button
            .setIcon(APP_PROPS.trashIcon)
            .onClick(async () => {
              new ModalConfirm(
                this.app,
                `Delete Custom Command`,
                `Are you sure you want to permanently delete this command?` +
                  `<span class="oq-confirm-cmdname">${command.name}</span>` +
                  `The template note will remain in your vault.`,
                "Delete",
                true,
                async () => {
                  delete commands[command.id];
                  await saveSettings();
                  this.plugin.removeCommand(command.id);
                  this.display(); // Refresh the list
                  new Notice(`Deleted command:\n${command.name}`);
                }
              ).open();
            })
            .setTooltip("Delete...", {
              placement: "top",
            })
        );
      // Add class clicableIcon to each button in the setting
      customCommand.settingEl.findAll("button").forEach((btn) => {
        btn.classList.add(clickableIcon);
      });
    });
  }
}
