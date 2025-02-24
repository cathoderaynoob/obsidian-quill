import { App, Modal } from "obsidian";
import { QuillPluginSettings } from "@/settings";

class ModalSaveMessageAs extends Modal {
  private content: string;
  private folderPaths: string[];
  private onSubmit: (name: string, path: string, openFile: boolean) => void;
  private settings: QuillPluginSettings;

  constructor(
    app: App,
    settings: QuillPluginSettings,
    content: string,
    folderPaths: string[],
    onSubmit: (name: string, path: string, openFile: boolean) => void
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
    const selectFolderField = saveAsForm.createEl("select", {
      attr: { id: "oq-saveas-folder" },
    });
    this.folderPaths.forEach((folderPath) => {
      const option = selectFolderField.createEl("option", {
        text: folderPath,
        attr: {
          value: folderPath,
        },
      });
      selectFolderField.appendChild(option);
      // Select the folder that the user has set in the settings
      selectFolderField.value = this.settings.messagesFolder;
    });

    // Modal Footer
    const footer = saveAsForm.createDiv({
      attr: {
        id: "oq-saveas-footer",
      },
    });

    // Open file after saving
    const openFile = footer.createEl("input", {
      attr: {
        id: "oq-saveas-openfile",
        type: "checkbox",
      },
    });
    openFile.checked = this.settings.openSavedFile;
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
        selectFolderField.value,
        openFile.checked
      );
    };

    // Add event listener to saveAsContainer for Return key
    saveAsForm.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        if (document.activeElement === filenameEl) {
          event.preventDefault();
          saveButton.click();
        } else if (document.activeElement === selectFolderField) {
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
