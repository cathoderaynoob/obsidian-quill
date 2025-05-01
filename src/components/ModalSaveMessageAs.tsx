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
    const { addDefaultFolderDropdown } = DefaultFolderUtils.getInstance(
      this.pluginServices,
      this.settings
    );

    this.setTitle("Save message as a note");
    // Save message as...
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

    // Add select menu
    const selectFieldsContainer = saveAsForm.createEl("div", {
      cls: "oq-select-fields",
    });
    const selectFolderComp = new DropdownComponent(selectFieldsContainer);
    addDefaultFolderDropdown(selectFolderComp, "messages", () =>
      selectFolderComp.selectEl.removeClass(
        ELEM_CLASSES_IDS.menuPlaceholder,
        ELEM_CLASSES_IDS.menuDefault
      )
    );
    if (this.commandFolderPath && this.commandFolderPath !== "")
      selectFolderComp.setValue(this.commandFolderPath);

    // To folder...
    const settingsMessagesPath = this.settings.pathMessages;
    const allFolderPaths = vaultUtils.getAllFolderPaths();
    const isMissingFolder = !allFolderPaths.includes(settingsMessagesPath);

    // If the default messages folder is missing, add an option to
    // save the selected folder as default
    let isSaveAsDefaultChecked = false;
    if (isMissingFolder) {
      const saveAsDefaultDiv = selectFieldsContainer.createDiv({
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
    }

    // Modal Footer
    const footer = saveAsForm.createDiv({
      attr: {
        id: "oq-saveas-message-footer",
      },
    });

    // Open file after saving
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

    // Save Button
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

    // Cancel Button
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
