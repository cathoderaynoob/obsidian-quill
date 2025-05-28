import { App, DropdownComponent, Modal } from "obsidian";
import { IPluginServices } from "@/interfaces";
import { ELEM_CLASSES_IDS } from "@/constants";
import { QuillPluginSettings } from "@/settings";
import DefaultFolderUtils from "@/DefaultFolderUtils";
import VaultUtils from "@/VaultUtils";

class ModalSaveMessageAs extends Modal {
  private pluginServices: IPluginServices;
  private settings: QuillPluginSettings;
  private content: string;
  private onSubmit: (
    name: string,
    folderPath: string,
    openFile: boolean,
    saveAsDefault: boolean
  ) => void;
  private commandFolderPath?: string;

  constructor(
    app: App,
    settings: QuillPluginSettings,
    content: string,
    onSubmit: (
      name: string,
      folderPath: string,
      openFile: boolean,
      saveAsDefault: boolean
    ) => void,
    commandFolderPath?: string
  ) {
    super(app);
    this.settings = settings;
    this.content = content;
    this.onSubmit = onSubmit;
    this.commandFolderPath = commandFolderPath;
    this.shouldRestoreSelection = true;
  }

  onOpen() {
    const { contentEl } = this;
    const saveAsForm = contentEl.createEl("form", {
      attr: { id: "oq-saveas-form" },
    });
    const vaultUtils = VaultUtils.getInstance(
      this.pluginServices,
      this.settings
    );
    const { addDefaultFolderDropdown, DEFAULT_FOLDERS } =
      DefaultFolderUtils.getInstance(this.pluginServices, this.settings);

    this.setTitle("Save to a new note");

    // FILENAME ---------------------------------------------------------------
    const filenameEl = saveAsForm.createEl("input", {
      attr: {
        type: "text",
        id: "oq-saveas-filename",
        placeholder:
          "Enter a note name, or leave blank to use the date and time",
        value: vaultUtils.createFilenameFromTitle(this.content),
      },
    });
    filenameEl.select();

    // SAVE TO FOLDER ---------------------------------------------------------
    const settingsMessagesPath = this.settings.pathMessages;
    const allFolderPaths = vaultUtils.getAllFolderPaths();
    const isMissingFolder = !allFolderPaths.includes(settingsMessagesPath);
    const isDefaultSelected = (): boolean => {
      return selectFolderComp.selectEl.value === DEFAULT_FOLDERS.pathMessages;
    };

    // Add select menu
    const selectFieldContainer = saveAsForm.createEl("div", {
      cls: "oq-select-field",
    });
    const selectFolderComp = new DropdownComponent(selectFieldContainer);
    addDefaultFolderDropdown(selectFolderComp, "messages", () =>
      selectFolderComp.selectEl.removeClass(
        ELEM_CLASSES_IDS.menuPlaceholder,
        ELEM_CLASSES_IDS.menuDefault
      )
    );
    // Set value — If custom command, select it instead of plugin default
    if (this.commandFolderPath && this.commandFolderPath !== "")
      selectFolderComp.setValue(this.commandFolderPath);

    // SET AS DEFAULT FOLDER --------------------------------------------------
    let isSaveAsDefaultChecked = false;
    // Specified folder is missing: If the default messages folder is
    // missing, or if the user has never specified a default, add an option
    // to save the selected folder as default.
    if (isMissingFolder && selectFolderComp.selectEl.value !== "") {
      // Layout accomodation for checkbox + label
      const saveAsDefaultDiv = selectFieldContainer.createDiv({
        attr: {
          class: "oq-saveas-default-container",
        },
      });
      const saveAsDefault = saveAsDefaultDiv.createEl("input", {
        attr: {
          id: "oq-saveas-default",
          type: "checkbox",
        },
      });

      // Add event to update the value of isSaveAsDefaultChecked
      saveAsDefault.onchange = () => {
        isSaveAsDefaultChecked = saveAsDefault.checked;
      };
      saveAsDefaultDiv.createEl("label", {
        text: "Set as my default messages folder",
        attr: {
          for: "oq-saveas-default",
        },
      });

      selectFolderComp.selectEl.onchange = () => {
        handleFolderChange();
      };
      const handleFolderChange = (): void => {
        const isDefault = isDefaultSelected();
        saveAsDefault.disabled = isDefault;
        saveAsDefaultDiv.toggleClass("oq-disabled", isDefault);
        if (isDefault) saveAsDefault.checked = true;
      };
      handleFolderChange();
    }

    // MODAL FOOTER ===========================================================
    const footer = saveAsForm.createDiv({
      attr: {
        id: "oq-saveas-message-footer",
      },
    });

    // OPEN FILE AFTER SAVING -------------------------------------------------
    const openFile = footer.createEl("input", {
      attr: {
        id: "oq-saveas-openfile",
        type: "checkbox",
      },
    });
    openFile.checked = this.settings.openAfterSave;
    footer.createEl("label", {
      text: "Open note after saving",
      attr: {
        for: "oq-saveas-openfile",
      },
    });

    // SAVE BUTTON ------------------------------------------------------------
    const saveButton = footer.createEl("button", {
      text: "Save",
      attr: {
        type: "submit",
      },
    });

    saveAsForm.onsubmit = (event) => {
      event.preventDefault();
      this.onSubmit(
        filenameEl.value,
        selectFolderComp.selectEl.value,
        openFile.checked,
        isSaveAsDefaultChecked
      );
    };

    // CANCEL BUTTON ----------------------------------------------------------
    footer.createEl("button", {
      text: "Cancel",
      attr: {
        type: "button",
      },
    }).onclick = () => this.close();

    // Add event listener to saveAsContainer for Return key
    saveAsForm.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        if (document.activeElement === filenameEl) {
          event.preventDefault();
          saveButton.click();
        } else if (document.activeElement === selectFolderComp.selectEl) {
          event.preventDefault();
        }
      }
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

export default ModalSaveMessageAs;
