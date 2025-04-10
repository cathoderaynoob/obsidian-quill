import {
  App,
  ButtonComponent,
  DropdownComponent,
  Notice,
  PluginSettingTab,
  Setting,
} from "obsidian";
import { APP_PROPS, ELEM_CLASSES_IDS, OPENAI_MODELS } from "@/constants";
import {
  Command,
  Commands,
  folderSettingNames,
  IPluginServices,
} from "@/interfaces";
import QuillPlugin from "@/main";
import VaultUtils from "@/VaultUtils";
import DefaultFolderUtils from "@/DefaultFolderUtils";
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

  private highlightIfEmpty = async (
    settingEl: Setting,
    value: string
  ): Promise<void> => {
    !value
      ? settingEl.controlEl.addClass(ELEM_CLASSES_IDS.validationEmpty)
      : settingEl.controlEl.removeClass(ELEM_CLASSES_IDS.validationEmpty);
  };

  display(): void {
    const { containerEl } = this;
    const settings = this.plugin.settings;
    const vaultUtils = VaultUtils.getInstance(this.pluginServices, settings);
    const {
      addDefaultFolderDropdown,
      addOpenFolderButton,
      validateTemplateFile,
    } = DefaultFolderUtils.getInstance(
      this.pluginServices,
      settings,
      vaultUtils
    );
    containerEl.setAttr("id", "oq-settings");
    containerEl.empty();

    this.containerEl.createEl("h3", {
      text: "Obsidian Quill",
    });

    // Section: OpenAI ========================================================
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
            await this.highlightIfEmpty(apikeySetting, settings.openaiApiKey);
          });
        text.inputEl.onfocus = async () => {
          await this.highlightIfEmpty(apikeySetting, settings.openaiApiKey);
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

    // Section: Saving Conversations and Messages =============================
    const onMenuChange = async (
      dropdown: DropdownComponent,
      folderSetting: folderSettingNames,
      folderPath: string
    ): Promise<void> => {
      dropdown.selectEl.removeClass(
        ELEM_CLASSES_IDS.menuPlaceholder,
        ELEM_CLASSES_IDS.menuDefault
      );
      settings[folderSetting] = folderPath;
      this.display();
      await this.pluginServices.saveSettings();
    };

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
    new Setting(containerEl)
      .setName("Save Conversations To...")
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
      .setName("Save Messages To...")
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
      .setClass("oq-settings-section-title")
      .setDesc(
        "Each custom command is a combination of a template note and a " +
          "command definition."
      );
    new Setting(containerEl)
      .setName("Command Templates")
      .setDesc(
        "Store all your command templates in the folder selected here. " +
          "To add a new command, first create a note in the templates folder. " +
          "The note may contain template structure, instruction, and any " +
          "other information you find most effective for the desired response."
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
        dropdown.selectEl.id = ELEM_CLASSES_IDS.menuTemplates;
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
      const menuTemplates = document.getElementById(
        ELEM_CLASSES_IDS.menuTemplates
      );
      if (menuTemplates) {
        const menuIsDisabled = menuTemplates.hasClass(
          ELEM_CLASSES_IDS.disabled
        );
        button.setDisabled(menuIsDisabled);
        if (menuIsDisabled)
          button.setTooltip("Select a Command Templates folder above.", {
            placement: "top",
          });
        button.buttonEl.toggleClass(ELEM_CLASSES_IDS.disabled, menuIsDisabled);
      }
    };

    // Add New Custom Command -------------------------------------------------
    new Setting(containerEl)
      .setName("Command Definitions")
      .setDesc(
        "Have a template ready? Next, create a custom command to use it."
      )
      .addButton((button) => {
        button.setButtonText("New Custom Command").onClick(async () => {
          new ModalCustomCommand(
            this.pluginServices,
            settings,
            async (id: string, command: Command) => {
              settings.commands[id] = command;
              await this.pluginServices.saveSettings();
              await this.pluginServices.loadCommands();
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
      const hasTemplateFile = await validateTemplateFile(
        command.templateFilename,
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

      const customCommand = new Setting(containerEl)
        .setName(command.name)
        .setDesc(`${modelString} » ${targetString} ${promptString}`)
        .setClass("oq-settings-custom-command")
        // Open Template File
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
          openTemplateButton.buttonEl.toggleClass(
            ELEM_CLASSES_IDS.btnWarn,
            !hasTemplateFile
          );
        })
        // Edit Command
        .addButton((button) => {
          button
            .setIcon(APP_PROPS.editIcon)
            .setTooltip("Edit", {
              placement: "top",
            })
            .onClick(async () => {
              new ModalCustomCommand(
                this.pluginServices,
                settings,
                async (id: string, command: Command) => {
                  settings.commands[id] = command;
                  await this.pluginServices.saveSettings();
                  await this.pluginServices.loadCommands();
                  this.display();
                  new Notice(`Updated command:\n${command.name}`);
                },
                command.id
              ).open();
            });
          // If no template folder selected
          disableIfNoTemplateFolder(button);
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
                  `The template file will remain in your vault.`,
                "Delete",
                true,
                async () => {
                  delete commands[command.id];
                  await this.pluginServices.saveSettings();
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
      // Add class ELEM_CLASSES_IDS.clicableIcon to each button in the setting
      customCommand.settingEl.findAll("button").forEach((btn) => {
        btn.classList.add(ELEM_CLASSES_IDS.clickableIcon);
      });
    });
  }
}
