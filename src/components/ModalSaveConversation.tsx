import { DropdownComponent, Modal } from "obsidian";
import { IPluginServices } from "@/interfaces";
import { ELEM_CLASSES_IDS } from "@/constants";
import { QuillPluginSettings } from "@/settings";
import DefaultFolderUtils from "@/DefaultFolderUtils";
import VaultUtils from "@/VaultUtils";

class ModalSaveConversation extends Modal {
  private pluginServices: IPluginServices;
  private settings: QuillPluginSettings;
  private onSubmit: (path: string) => void;

  constructor(
    pluginServices: IPluginServices,
    settings: QuillPluginSettings,
    onSubmit: (path: string) => void
  ) {
    super(pluginServices.app);
    this.pluginServices = pluginServices;
    this.settings = settings;
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
      this.settings
    );
    const { getAllFolderPaths } = VaultUtils.getInstance(
      this.pluginServices,
      this.settings
    );

    this.setTitle("Quill: Save Conversation to...");
    // Save conversation to folder...
    const settingsConversationsPath = this.settings.pathConversations;
    const isNewUser = settingsConversationsPath === "";
    const allFolderPaths = getAllFolderPaths();
    const isMissingFolder = !allFolderPaths.includes(settingsConversationsPath);

    if (isNewUser || isMissingFolder) {
      const message = isNewUser
        ? "Select a folder for your saved conversations. You can change " +
          "this later in Settings."
        : "Your default conversations folder could not be found:";
      saveAsForm.createDiv({
        text: message,
      });
      saveAsForm.createDiv({
        cls: ELEM_CLASSES_IDS.filePath,
        text: settingsConversationsPath,
      });
    }

    // Add select menu
    const selectFieldContainer = saveAsForm.createEl("div", {
      cls: "oq-select-field",
    });
    const selectFolderComp = new DropdownComponent(selectFieldContainer);
    addDefaultFolderDropdown(selectFolderComp, "conversations", () =>
      selectFolderComp.selectEl.removeClass(
        ELEM_CLASSES_IDS.menuPlaceholder,
        ELEM_CLASSES_IDS.menuDefault
      )
    );

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
