import { App, DropdownComponent, Modal } from "obsidian";
import { DEFAULT_SETTINGS, QuillPluginSettings } from "@/settings";

class ModalSaveConversation extends Modal {
  private content: string;
  private folderPaths: string[];
  private onSubmit: (path: string) => void;
  private settings: QuillPluginSettings;

  constructor(
    app: App,
    settings: QuillPluginSettings,
    folderPaths: string[],
    onSubmit: (path: string) => void
  ) {
    super(app);
    this.settings = settings;
    this.folderPaths = folderPaths;
    this.onSubmit = onSubmit;
    this.shouldRestoreSelection = true;
  }

  onOpen() {
    const { contentEl } = this;
    const saveAsForm = contentEl.createEl("form", {
      attr: { id: "oq-saveas-form" },
    });

    this.setTitle("Save Conversation to...");
    // Save conversation to folder...
    const defaultConversationFolder = DEFAULT_SETTINGS.pathConversations;
    const settingsConversationsPath = this.settings.pathConversations;
    const isNewUser = settingsConversationsPath === "";
    const isMissingFolder = !this.folderPaths.includes(
      settingsConversationsPath
    );

    if (isNewUser || isMissingFolder) {
      const message = isNewUser
        ? "Select a folder for your saved conversations. You can change " +
          "this later in Settings."
        : "Your default conversations folder could not be found:";
      saveAsForm
        .createDiv({
          cls: "oq-warn-text",
          text: message,
        })
        .createDiv({
          cls: "oq-filepath",
          text: settingsConversationsPath,
        });
    }

    // Add select menu
    const selectFieldsContainer = saveAsForm.createDiv({
      cls: "oq-select-fields",
    });

    const selectFolderComp = new DropdownComponent(selectFieldsContainer);

    if (isNewUser) {
      selectFolderComp.addOption(
        defaultConversationFolder,
        `${defaultConversationFolder}  (Quill plugin default)`
      );
    } else if (isMissingFolder) {
      selectFolderComp.selectEl.createEl("option", {
        text: "Save to folder and set as default...",
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
      ? defaultConversationFolder
      : isMissingFolder
      ? ""
      : settingsConversationsPath;

    selectFolderComp.setValue(selectedPath);

    // Style the empty selection option elem
    selectFolderComp.selectEl.toggleClass("oq-disabled", selectedPath === "");
    selectFolderComp.onChange(() => {
      const isEmpty = selectFolderComp.getValue() === "";
      selectFolderComp.selectEl.toggleClass("oq-disabled", isEmpty);
    });

    // Modal Footer
    const footer = saveAsForm.createDiv({
      attr: {
        id: "oq-saveas-convo-footer",
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
      this.onSubmit(selectFolderComp.selectEl.value);
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
        event.preventDefault();
        if (document.activeElement === saveButton) {
          saveButton.click();
        }
      }
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

export default ModalSaveConversation;
