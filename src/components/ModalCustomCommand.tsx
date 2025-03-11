import { App, Modal, setTooltip } from "obsidian";
import {
  DEFAULT_SETTINGS,
  QuillPluginSettings,
  OPENAI_MODELS,
} from "@/settings";
import { Command, IPluginServices } from "@/interfaces";
import VaultUtils from "@/VaultUtils";
import { ELEM_CLASSES_IDS } from "@/constants";

class ModalCustomCommand extends Modal {
  private onSubmit: (id: string, command: Command) => void;
  private settings: QuillPluginSettings;
  private pluginServices: IPluginServices;
  private commandId?: string;

  constructor(
    app: App,
    settings: QuillPluginSettings,
    pluginServices: IPluginServices,
    onSubmit: (id: string, command: Command) => void,
    commandId?: string
  ) {
    super(app);
    this.settings = settings;
    this.pluginServices = pluginServices;
    this.onSubmit = onSubmit;
    this.shouldRestoreSelection = true;
    this.commandId = commandId || undefined;
    this.setTitle(
      commandId ? "Edit Custom Command" : "New Quill Custom Command"
    );
  }

  onOpen() {
    const vaultUtils = VaultUtils.getInstance(
      this.pluginServices,
      this.settings
    );
    const { contentEl } = this;
    const newCommandForm = contentEl.createEl("form", {
      attr: { id: "oq-newcommand-form" },
    });
    const commandToEdit: Command | undefined = this.commandId
      ? this.settings.commands[this.commandId]
      : undefined;

    // Function to check if all required fields are filled
    const checkRequiredFields = () => {
      if (
        commandNameEl.value.trim() &&
        selectTemplateEl.value &&
        selectOutputTargetEl.value
      ) {
        saveButton.removeAttribute("disabled");
        setTooltip(saveButton, "");
      } else {
        saveButton.setAttribute("disabled", "disabled");
        setTooltip(saveButton, "Please fill in all required fields", {
          placement: "top",
        });
      }
    };
    newCommandForm.addEventListener("input", checkRequiredFields);

    const formBody = newCommandForm.createDiv({
      attr: {
        id: "oq-newcommand-body",
      },
    });
    // NEW COMMAND NAME -------------------------------------------------------
    formBody.createEl("label", {
      text: "Command Name",
      attr: {
        for: "oq-newcommand-name",
      },
    });
    const commandNameEl = formBody.createEl("input", {
      attr: {
        type: "text",
        id: "oq-newcommand-name",
        placeholder: "... as it will appear in the Command Palette",
        value: commandToEdit?.name || "",
        maxlength: 75,
      },
    });
    commandNameEl.select();

    // SELECT TEMPLATE MENU ---------------------------------------------------
    // Select command template from templates folder defined by user in Settings
    formBody.createEl("label", {
      text: "Template File",
      attr: {
        for: ELEM_CLASSES_IDS.cmdTemplate,
      },
    });

    const selectTemplateEl = formBody.createEl("select", {
      attr: { id: ELEM_CLASSES_IDS.cmdTemplate },
    });

    // Populate the menu with the list of markdown files in the templates folder
    (async () => {
      const templatesFolder =
        this.settings.pathTemplates || DEFAULT_SETTINGS.pathTemplates;
      const templateFiles = await vaultUtils.getListOfMarkdownFilesByPath(
        templatesFolder
      );
      // Add a default option
      selectTemplateEl.createEl("option", {
        text: `... in folder "${templatesFolder}"`,
        attr: {
          value: "",
          disabled: "disabled",
        },
      });

      const fileNames = templateFiles.map((filepath: string) =>
        vaultUtils.getFilenameByPath(filepath)
      );
      // Add options for each template file
      fileNames.forEach((filename: string) => {
        if (!filename) return;
        const option = selectTemplateEl.createEl("option", {
          text: filename.replace(".md", ""),
          attr: {
            value: filename,
          },
        });
        selectTemplateEl.appendChild(option);
      });
      // If editing a command, select the template file in the list.
      // If the commandToEdit.templateFile is not in the list, select the
      // default option
      selectTemplateEl.value = "";
      if (commandToEdit) {
        if (fileNames.includes(commandToEdit.templateFilename)) {
          selectTemplateEl.value = commandToEdit.templateFilename;
        } else {
          selectTemplateEl.focus();
        }
      }
      checkRequiredFields();
    })();

    // OUTPUT TARGET MENU ----------------------------------------------------
    // Select where the output of the command will be displayed
    formBody.createEl("label", {
      text: "Output response to",
      attr: {
        for: "oq-newcommand-target",
      },
    });
    const selectOutputTargetEl = formBody.createEl("select", {
      attr: { id: "oq-newcommand-target" },
    });
    selectOutputTargetEl.createEl("option", {
      text: "Conversation or Note?",
      attr: {
        value: "",
        disabled: "disabled",
      },
    });
    // Populate the menu with the list of markdown files in the templates folder
    const outputTargets = ["view", "editor"];
    outputTargets.forEach((target: string) => {
      const text =
        target === "view"
          ? "Conversation View — Respond in a chat message"
          : "Active Note — Where the cursor is in the note";
      const option = selectOutputTargetEl.createEl("option", {
        text: text,
        attr: {
          value: target,
        },
      });
      selectOutputTargetEl.appendChild(option);
    });
    selectOutputTargetEl.value = commandToEdit?.target || "";

    // MODEL SELECTION ------------------------------------------------
    formBody.createEl("label", {
      text: "Model",
      attr: {
        for: "oq-newcommand-model",
      },
    });
    const selectModel = formBody.createEl("select", {
      attr: { id: "oq-newcommand-model" },
    });
    selectModel.createEl("option", {
      text: `Default model (currently ${this.settings.openaiModel})`,
      attr: {
        value: "",
      },
    });
    OPENAI_MODELS.user.forEach((model) => {
      const option = selectOutputTargetEl.createEl("option", {
        text: model.display,
        attr: {
          value: model.model,
        },
      });
      selectModel.appendChild(option);
    });
    selectModel.value = commandToEdit?.model || "";

    // Modal Footer
    const footer = newCommandForm.createDiv({
      attr: {
        id: "oq-newcommand-footer",
      },
    });

    // DISPLAY PROMPT OPTION -------------------------------------------------
    const displayPromptEl = footer.createEl("input", {
      attr: {
        id: "oq-newcommand-displayprompt",
        type: "checkbox",
      },
    });
    displayPromptEl.checked = commandToEdit ? commandToEdit.prompt : false;
    footer.createEl("label", {
      text: "Command should open a prompt for additional info",
      attr: {
        for: "oq-newcommand-displayprompt",
      },
    });

    // SAVE BUTTON ------------------------------------------------------------
    const saveButton = footer.createEl("button", {
      text: "Save",
      attr: {
        type: "submit",
        disabled: "disabled",
      },
    });

    newCommandForm.onsubmit = (event) => {
      event.preventDefault();
      const commandId = this.commandId || this.generateCommandId();
      this.onSubmit(commandId, {
        name: commandNameEl.value.substring(0, 75).trim(),
        target: selectOutputTargetEl.value as Command["target"],
        prompt: displayPromptEl.checked,
        sendSelectedText: false,
        templateFilename: selectTemplateEl.value,
        model: selectModel.value,
      });
      this.close();
    };

    // Add event listener to saveAsContainer for Return key
    newCommandForm.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        if (document.activeElement === commandNameEl) {
          event.preventDefault();
          saveButton.click();
        } else if (document.activeElement === selectTemplateEl) {
          event.preventDefault();
        }
      }
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  generateCommandId(): string {
    // This will return a random string of 13 characters
    return `oq-cmd-${Math.random().toString(36).substring(2, 15)}`;
  }
}

export default ModalCustomCommand;
