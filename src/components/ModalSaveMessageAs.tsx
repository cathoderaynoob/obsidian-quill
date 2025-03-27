import { App, DropdownComponent, Modal } from "obsidian";
import { DEFAULT_SETTINGS, QuillPluginSettings } from "@/settings";

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

  constructor(
    app: App,
    settings: QuillPluginSettings,
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

    // To folder...
    const defaultMessagesFolder = DEFAULT_SETTINGS.pathMessages;
    const settingsMessagesPath = this.settings.pathMessages;
    const isNewUser = settingsMessagesPath === "";
    const isMissingFolder = !this.folderPaths.includes(settingsMessagesPath);

    if (isNewUser || isMissingFolder) {
      const message = isNewUser
        ? "Select a default folder for your saved messages. You can change " +
          "this later in Settings."
        : "Your default messages folder could not be found:";
      saveAsForm
        .createDiv({
          cls: "oq-warn-text",
          text: message,
        })
        .createDiv({
          cls: "oq-filepath",
          text: settingsMessagesPath,
        });
    }

    // Add select menu
    const selectFieldsContainer = saveAsForm.createDiv({
      cls: "oq-select-fields",
    });
    const selectFolderComp = new DropdownComponent(selectFieldsContainer);

    if (isNewUser) {
      selectFolderComp.addOption(
        defaultMessagesFolder,
        `${defaultMessagesFolder}  (Quill plugin default)`
      );
    } else if (isMissingFolder) {
      selectFolderComp.selectEl.createEl("option", {
        text: "Save to folder...",
        attr: {
          value: "",
          disabled: "disabled",
        },
      });
    }
    this.folderPaths.forEach((folderPath) => {
      selectFolderComp.addOption(folderPath, folderPath);
    });

    const selectedPath = isNewUser
      ? defaultMessagesFolder
      : isMissingFolder
      ? ""
      : settingsMessagesPath;

    selectFolderComp.setValue(selectedPath);

    // Style the empty selection option elem
    selectFolderComp.selectEl.toggleClass("oq-disabled", selectedPath === "");
    selectFolderComp.onChange(() => {
      const isEmpty = selectFolderComp.getValue() === "";
      selectFolderComp.selectEl.toggleClass("oq-disabled", isEmpty);
    });

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
