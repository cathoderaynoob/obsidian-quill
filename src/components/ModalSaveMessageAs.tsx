import { App, DropdownComponent, Modal } from "obsidian";
import { IPluginServices } from "@/interfaces";
import { QuillPluginSettings } from "@/settings";
import DefaultFolderUtils from "@/DefaultFolderUtils";
import VaultUtils from "@/VaultUtils";
import { ELEM_CLASSES_IDS } from "@/constants";

class ModalSaveMessageAs extends Modal {
  private content: string;
  private folderPaths: string[];
  private onSubmit: (
    name: string,
    path: string,
    openFile: boolean,
    saveAsDefault: boolean
  ) => void;
  private settings: QuillPluginSettings;
  private pluginServices: IPluginServices;
  private vaultUtils: VaultUtils;

  constructor(
    app: App,
    settings: QuillPluginSettings,
    vaultUtils: VaultUtils,
    content: string,
    folderPaths: string[],
    onSubmit: (
      name: string,
      path: string,
      openFile: boolean,
      saveAsDefault: boolean
    ) => void
  ) {
    super(app);
    this.settings = settings;
    this.vaultUtils = vaultUtils;
    this.content = content;
    this.folderPaths = folderPaths;
    this.onSubmit = onSubmit;
    this.shouldRestoreSelection = true;
  }

  onOpen() {
    const { contentEl } = this;
    const saveAsForm = contentEl.createEl("form", {
      attr: { id: "oq-saveas-form" },
    });
    const { addDefaultFolderDropdown } = DefaultFolderUtils.getInstance(
      this.pluginServices,
      this.settings,
      this.vaultUtils
    );

    this.setTitle("Save Message as a Note");
    // Save message as...
    const filenameEl = saveAsForm.createEl("input", {
      attr: {
        type: "text",
        id: "oq-saveas-filename",
        placeholder:
          "Enter a file name, or leave blank to use the date and time",
        value: this.createFilename(this.content),
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

    // To folder...
    const settingsMessagesPath = this.settings.pathMessages;
    const isMissingFolder = !this.folderPaths.includes(settingsMessagesPath);

    // Add an option to save the selected folder as default
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
      text: "Open file after saving",
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

  // This function finds the first existing heading in the message and
  // returns it so it can be presented as the default filename
  createFilename = (content: string) => {
    const headingRegex = /^(#+)\s+(.*)$/m;
    const match = content.match(headingRegex);
    // This returns the first heading
    const filename = match ? match[2] : "";
    return filename;
  };

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

export default ModalSaveMessageAs;
