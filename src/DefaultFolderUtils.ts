import {
  ButtonComponent,
  DropdownComponent,
  normalizePath,
  Notice,
  setTooltip,
  TFile,
  TFolder,
} from "obsidian";
import { InternalPlugins } from "obsidian-typings";
import { APP_PROPS, ELEM_CLASSES_IDS } from "@/constants";
import {
  DefaultSaveFolder,
  folderSettingNames,
  IPluginServices,
} from "@/interfaces";
import { QuillPluginSettings } from "@/settings";
import ModalConfirm from "@/components/ModalConfirm";
import ModalSaveConversation from "@/components/ModalSaveConversation";
import VaultUtils from "@/VaultUtils";

type FolderButtonAction = "open" | "create" | "warn";

class DefaultFolderUtils {
  private static instance: DefaultFolderUtils;
  private pluginServices: IPluginServices;
  private settings: QuillPluginSettings;
  private vaultUtils: VaultUtils;

  constructor(pluginServices: IPluginServices, settings: QuillPluginSettings) {
    this.pluginServices = pluginServices;
    this.settings = settings;
    this.vaultUtils = VaultUtils.getInstance(pluginServices, settings);
  }

  readonly DEFAULT_FOLDERS = {
    pathConversations: `${APP_PROPS.appName}/Conversations`,
    pathMessages: `${APP_PROPS.appName}/Messages`,
    pathTemplates: `${APP_PROPS.appName}/Templates`,
  };

  public static getInstance(
    pluginServices: IPluginServices,
    settings: QuillPluginSettings
  ): DefaultFolderUtils {
    if (!DefaultFolderUtils.instance) {
      DefaultFolderUtils.instance = new DefaultFolderUtils(
        pluginServices,
        settings
      );
    }
    return DefaultFolderUtils.instance;
  }

  addDefaultFolderDropdown = (
    dropdown: DropdownComponent,
    folderType: DefaultSaveFolder,
    onChangeHandler?: (selectedFolder: string) => void
  ): void => {
    const { pluginDefaultPath, userDefaultPath, settingName } =
      this.getDefaultFolderInfo(folderType);
    const vaultFolderPaths = this.vaultUtils.getAllFolderPaths();
    const hasUserSetDefault = userDefaultPath !== "";
    const pluginDefaultExists = vaultFolderPaths.contains(pluginDefaultPath);

    // Determine Folder Path To Select

    // If the plugin default folders exist but the user hasn't chosen a default
    // yet, set it to the plugin default for them. This preps for the next step
    if (!hasUserSetDefault && pluginDefaultExists) {
      this.settings[settingName] = pluginDefaultPath;
      this.pluginServices.saveSettings();
    }
    // Determine option elems to show and which of them to select
    const shouldShowPluginDefault = !!(pluginDefaultPath && !userDefaultPath);
    const pathToSelect = !hasUserSetDefault
      ? // If user hasn't set a default, select the plugin's default folder
        pluginDefaultPath
      : // If the user has set a default, does the folder exist?
      vaultFolderPaths.contains(userDefaultPath)
      ? // Yes it exists, so select it
        userDefaultPath
      : // No, it's missing, so select the menu's "placeholder" option
        "";

    // Create the placeholder option
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

    // Show the plugin's default folder
    if (shouldShowPluginDefault) {
      if (!this.vaultUtils.getFolderByPath(pluginDefaultPath, true)) {
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

    // For each folder found in the vault, add to the menu
    vaultFolderPaths.forEach((folderPath) => {
      if (!!pluginDefaultPath || folderPath !== pluginDefaultPath) {
        dropdown.addOption(folderPath, folderPath);
      }
    });
    dropdown.setValue(pathToSelect);
    dropdown.selectEl.toggleClass(
      ELEM_CLASSES_IDS.disabled,
      pathToSelect === ""
    );

    // When a folder is selected, run the callback
    dropdown.onChange(async (selectedFolder) => {
      if (onChangeHandler) onChangeHandler(selectedFolder);
    });
  };

  private getDefaultFolderInfo = (folderType: DefaultSaveFolder) => {
    const folderMapping: Record<
      DefaultSaveFolder,
      {
        pluginDefaultPath: string;
        userDefaultPath: string;
        settingName: folderSettingNames;
      }
    > = {
      conversations: {
        pluginDefaultPath: this.DEFAULT_FOLDERS.pathConversations,
        userDefaultPath: this.settings.pathConversations,
        settingName: "pathConversations",
      },
      messages: {
        pluginDefaultPath: this.DEFAULT_FOLDERS.pathMessages,
        userDefaultPath: this.settings.pathMessages,
        settingName: "pathMessages",
      },
      templates: {
        pluginDefaultPath: this.DEFAULT_FOLDERS.pathTemplates,
        userDefaultPath: this.settings.pathTemplates,
        settingName: "pathTemplates",
      },
    };
    return folderMapping[folderType];
  };

  addOpenFolderButton = ({
    button,
    folderType,
    folderActionHandler,
  }: {
    button: ButtonComponent;
    folderType: DefaultSaveFolder;
    folderActionHandler?: (action: FolderButtonAction) => void;
  }): TFolder | false => {
    const app = this.pluginServices.app;
    // If we can use the file-explorer, let's, for a good user experience.
    // Otherwise, don't add the button.
    const internalPlugins: InternalPlugins = app.internalPlugins;
    const fileExpl = internalPlugins.getEnabledPluginById("file-explorer");
    if (!fileExpl) return false;

    // Get the default folder info for reference in the method
    const { pluginDefaultPath, userDefaultPath, settingName } =
      this.getDefaultFolderInfo(folderType);

    // Which folder will the button open?
    const folderToOpen =
      this.settings[settingName] === "" ? pluginDefaultPath : userDefaultPath;
    const folder = this.vaultUtils.getFolderByPath(folderToOpen, true);
    const { icon, tooltip, action, btnClass } = this.getFolderButtonProps(
      userDefaultPath,
      pluginDefaultPath
    );

    // Style the button
    button.setIcon(icon).setTooltip(tooltip, { placement: "top" });
    button.buttonEl.addClass(ELEM_CLASSES_IDS.clickableIcon);
    if (btnClass) button.buttonEl.addClass(btnClass);

    // Add functionality to the button
    switch (action) {
      // Reveal the folder in the the file explorer
      case "open":
        button.onClick(async () => {
          if (!folder) return;
          try {
            fileExpl.revealInFolder(folder);
            if (folderActionHandler) folderActionHandler("open");
          } catch (error) {
            new Notice("Error opening folder.");
            console.error(`Error opening ${folderType} folder:`, error);
          }
        });
        break;
      // Create the folder and set it as default
      case "create":
        button.onClick(async () => {
          try {
            await this.vaultUtils.createFolder(folderToOpen);
            this.settings[settingName] = folderToOpen;
            await this.pluginServices.saveSettings();
            new Notice(
              `Folder created successfully and\nset to default:\n\n"${folderToOpen}"`
            );
            if (folderActionHandler) folderActionHandler("create");
          } catch (e) {
            this.pluginServices.notifyError("folderCreateError", e);
          }
        });
        break;
    }
    return folder || false;
  };

  // Is there a valid default folder set?
  hasValidDefaultFolder = async (
    folderType: DefaultSaveFolder,
    createFolderIfMissing?: boolean
  ): Promise<boolean> => {
    const folderPath = await this.getDefaultFolderPath(
      folderType,
      createFolderIfMissing
    );
    const hasValidFolder =
      folderPath !== "" &&
      this.vaultUtils.getFolderByPath(folderPath, true) !== null;
    return hasValidFolder;
  };

  validateTemplateFile = async (
    fileName: string,
    suppressPrompt?: boolean
  ): Promise<boolean> => {
    const { getFileByPath } = this.vaultUtils;
    const filePath = await this.getTemplateFilePath(fileName);

    // Check for missing template folder
    if (!(await this.hasValidDefaultFolder("templates"))) {
      if (!suppressPrompt) this.promptMissingTemplateFolder();
      return false;
    }
    // Check for the file itself
    if (filePath === null || !getFileByPath(filePath, true)) {
      if (!suppressPrompt) this.promptMissingTemplateFile(fileName);
      return false;
    }
    return true;
  };

  // This simply constructs and returns the path to the template file
  getTemplateFilePath = async (fileName: string): Promise<string> => {
    const folderPath = await this.getDefaultFolderPath("templates");
    return normalizePath(`${folderPath}/${fileName}`);
  };

  getTemplateFile = async (fileName: string): Promise<TFile | null> => {
    const templateFilePath = await this.getTemplateFilePath(fileName);
    return this.vaultUtils.getFileByPath(templateFilePath);
  };

  getTemplateFileContent = async (fileName: string): Promise<string | null> => {
    const templateFile = await this.getTemplateFile(fileName);
    if (!templateFile) return null;
    try {
      return await this.vaultUtils.getFileContent(templateFile);
    } catch (e) {
      this.pluginServices.notifyError("fileReadError", e);
      return null;
    }
  };

  // Get the default folder path for the type provided, and
  // optionally create it if it's missing
  getDefaultFolderPath = async (
    folder: DefaultSaveFolder,
    createFolderIfMissing?: boolean
  ): Promise<string> => {
    const { createFolder, getFolderByPath } = this.vaultUtils;
    let folderPath = "";
    switch (folder) {
      case "conversations":
        // Check settings for user's preference
        folderPath = this.settings.pathConversations;
        // If not yet set, or the folder is missing, prompt to select one
        if (folderPath === "" || getFolderByPath(folderPath, true) === null) {
          folderPath = await this.promptForConvoFolder();
        }
        break;
      case "messages":
        folderPath =
          this.settings.pathMessages || this.DEFAULT_FOLDERS.pathMessages;
        break;
      case "templates":
        folderPath = this.settings.pathTemplates;
        break;
    }
    // If folder at the given path is missing, optionally create it
    if (createFolderIfMissing && getFolderByPath(folderPath, true) === null) {
      createFolder(folderPath);
    }
    return folderPath;
  };

  promptMissingTemplateFolder = (): void => {
    new ModalConfirm(
      this.pluginServices.app,
      "Quill: Choose a Default Templates Folder",
      "Your default templates folder hasn't yet been set, " +
        "or is missing. You can update this in the Settings for Quill.",
      "Open Settings",
      false,
      async () => {
        await this.pluginServices.openPluginSettings();
      }
    ).open();
  };

  private msgTemplateMissing = (filename: string): DocumentFragment => {
    return createFragment((descEl) => {
      descEl.appendText("Your command template note can't be found:");
      descEl.createEl("span", {
        cls: ELEM_CLASSES_IDS.filePath,
        text: filename,
      });
      descEl.appendText(
        "You can select a different note in Settings, " +
          "or restore the original and try again."
      );
    });
  };

  promptMissingTemplateFile = (filename: string): void => {
    new ModalConfirm(
      this.pluginServices.app,
      "Quill: Command Template Missing",
      this.msgTemplateMissing(filename),
      "Open Settings",
      false,
      async () => {
        await this.pluginServices.openPluginSettings();
      }
    ).open();
  };

  private promptForConvoFolder = async (): Promise<string> => {
    return new Promise((resolve) => {
      const modal = new ModalSaveConversation(
        this.pluginServices,
        this.settings,
        async (folderPath) => {
          this.settings.pathConversations = folderPath;
          this.pluginServices.saveSettings();
          modal.close();
          resolve(folderPath);
        }
      );
      modal.open();
    });
  };

  // Helper function to determine button properties
  private getFolderButtonProps = (
    settingsPath: string,
    defaultPath: string
  ): {
    icon: string;
    tooltip: string;
    action: FolderButtonAction;
    btnClass?: string;
  } => {
    const folderPath = settingsPath || defaultPath;
    const folderExists = this.vaultUtils.getFolderByPath(folderPath, true);

    // Folder does not exist
    if (!folderExists) {
      // User has not chosen a folder, and the default folder is missing
      if (settingsPath === "") {
        return {
          icon: APP_PROPS.folderAddIcon,
          tooltip: `Create folder\n"${defaultPath}"`,
          action: "create",
          btnClass: ELEM_CLASSES_IDS.btnAction,
        };
      }
      // User has chosen a folder, but it is missing
      else {
        return {
          icon: APP_PROPS.folderMissingIcon,
          tooltip: `Folder is missing:\n"${settingsPath}"`,
          action: "warn",
          btnClass: ELEM_CLASSES_IDS.btnWarn,
        };
      }
    }

    // Folder exists
    return {
      icon: APP_PROPS.folderOpenIcon,
      tooltip: `Open folder\n"${folderPath}"`,
      action: "open",
    };
  };
}

export default DefaultFolderUtils;
