import { DropdownComponent, Modal, setTooltip } from "obsidian";
import { ELEM_CLASSES_IDS, OPENAI_MODELS } from "@/constants";
import { Command, IPluginServices, OutputTarget } from "@/interfaces";
import { DEFAULT_SETTINGS, QuillPluginSettings } from "@/settings";
import VaultUtils from "@/VaultUtils";
const { cmdFooter, menuPlaceholder, menuTarget, menuTemplates } =
  ELEM_CLASSES_IDS;

class ModalCustomCommand extends Modal {
  private pluginServices: IPluginServices;
  private settings: QuillPluginSettings;
  private onSubmit: (id: string, command: Command) => void;
  private commandId?: string;

  constructor(
    pluginServices: IPluginServices,
    settings: QuillPluginSettings,
    onSubmit: (id: string, command: Command) => void,
    commandId?: string
  ) {
    super(pluginServices.app);
    this.pluginServices = pluginServices;
    this.settings = settings;
    this.onSubmit = onSubmit;
    this.shouldRestoreSelection = true;
    this.commandId = commandId || undefined;
    this.setTitle(
      commandId ? "Quill: Edit Custom Command" : "Quill: New Custom Command"
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
        selectTemplateComp.getValue() &&
        selectTargetComp.getValue()
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
      text: "Template Note",
      attr: {
        for: menuTemplates,
      },
    });

    const selectTemplateComp = new DropdownComponent(formBody);
    selectTemplateComp.selectEl.id = menuTemplates;

    // Populate the menu with the list of markdown files in the templates folder
    (async () => {
      const templatesFolder =
        this.settings.pathTemplates || DEFAULT_SETTINGS.pathTemplates;
      const templateFiles = await vaultUtils.getListOfMarkdownFilesByPath(
        templatesFolder
      );
      // Add a placeholder option
      selectTemplateComp.selectEl.createEl("option", {
        text: `... in folder "${templatesFolder}"`,
        attr: {
          value: "",
          disabled: "disabled",
        },
      });
      // Add options for each template file
      const fileNames = templateFiles.map((filepath: string) =>
        vaultUtils.getFilenameByPath(filepath)
      );
      fileNames.forEach((filename: string) => {
        if (!filename) return;
        selectTemplateComp.addOption(filename, filename.replace(".md", ""));
      });
      // If editing a command, select the template file in the list.
      // If the commandToEdit.templateFile is not in the list, select the
      // default option
      selectTemplateComp.setValue("");
      if (commandToEdit) {
        if (fileNames.includes(commandToEdit.templateFilename)) {
          selectTemplateComp.setValue(commandToEdit.templateFilename);
        } else {
          selectTemplateComp.selectEl.focus();
        }
      }
      this.togglePlaceholderClass(selectTemplateComp);
      checkRequiredFields();
    })();

    selectTemplateComp.onChange(() =>
      this.togglePlaceholderClass(selectTemplateComp)
    );

    // OUTPUT TARGET MENU ----------------------------------------------------
    // Select where the output of the command will be displayed
    formBody.createEl("label", {
      text: "Respond in...",
      attr: {
        for: menuTarget,
      },
    });
    const selectTargetComp = new DropdownComponent(formBody);
    selectTargetComp.selectEl.id = menuTarget;
    // Add a placeholder option
    selectTargetComp.selectEl.createEl("option", {
      text: "Conversation, or active note?",
      attr: {
        value: "",
        disabled: "disabled",
      },
    });
    // Populate the menu with the list of markdown files in the templates folder
    const outputTargets: OutputTarget[] = ["view", "editor"];
    outputTargets.forEach((target: string) => {
      const text =
        target === "view"
          ? "Conversation (in the chat stream)"
          : "Active note (at the cursor position)";
      selectTargetComp.addOption(target, text);
    });
    selectTargetComp.setValue(commandToEdit?.target || "");

    selectTargetComp.selectEl.toggleClass(
      menuPlaceholder,
      selectTargetComp.getValue() === ""
    );

    selectTargetComp.onChange(() =>
      this.togglePlaceholderClass(selectTargetComp)
    );

    // MODEL SELECTION ------------------------------------------------
    formBody.createEl("label", {
      text: "Model",
      attr: {
        for: "oq-newcommand-model",
      },
    });
    const selectModelComp = new DropdownComponent(formBody);
    selectModelComp.addOption(
      "",
      `Default model (currently ${this.settings.openaiModel})`
    );
    OPENAI_MODELS.models.forEach((model) => {
      selectModelComp.addOption(model.id, model.name);
    });
    if (
      commandToEdit &&
      this.pluginServices.isSupportedModel(commandToEdit.model, true)
    )
      selectModelComp.setValue(commandToEdit?.model || "");

    // Modal Footer
    const footer = newCommandForm.createDiv({
      attr: {
        id: cmdFooter,
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
        target: selectTargetComp.getValue() as OutputTarget,
        prompt: displayPromptEl.checked,
        sendSelectedText: false,
        templateFilename: selectTemplateComp.getValue(),
        model: selectModelComp.getValue(),
      });
      this.close();
    };

    // Add event listener to saveAsContainer for Return key
    newCommandForm.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        if (document.activeElement === commandNameEl) {
          event.preventDefault();
          saveButton.click();
        } else if (document.activeElement === selectTemplateComp.selectEl) {
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

  togglePlaceholderClass = (dropdown: DropdownComponent): void => {
    dropdown.selectEl.toggleClass(menuPlaceholder, dropdown.getValue() === "");
  };
}

export default ModalCustomCommand;
