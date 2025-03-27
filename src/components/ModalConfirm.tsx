import { App, Modal } from "obsidian";

class ModalConfirm extends Modal {
  private title: string;
  private message: string;
  private submitButtonText: string;
  private submitButtonRed: boolean;
  private onSubmit: () => void;

  constructor(
    app: App,
    title: string | "Quill Confirmation",
    message:
      | string
      | "Are you sure you want to do this? This action cannot be undone.",
    submitButtonText: string | "Yes, I'm sure",
    submitButtonRed: boolean | false,
    onSubmit: () => void
  ) {
    super(app);
    this.onSubmit = onSubmit;
    this.title = title;
    this.message = message;
    this.submitButtonText = submitButtonText;
    this.submitButtonRed = submitButtonRed;
  }

  onOpen() {
    const { contentEl } = this;
    const confirmForm = contentEl.createEl("form", {
      attr: { id: "oq-confirm-form" },
    });

    this.setTitle(this.title);

    confirmForm.innerHTML = this.message;

    // Modal Footer
    const footer = confirmForm.createDiv({
      attr: {
        id: "oq-confirm-footer",
      },
    });

    // Submit Button
    const confirmButtonClass = this.submitButtonRed ? "mod-warning" : "";
    footer.createEl("button", {
      text: this.submitButtonText,
      cls: confirmButtonClass,
      attr: {
        type: "submit",
      },
    });

    confirmForm.onsubmit = (event) => {
      event.preventDefault();
      this.onSubmit();
      this.close();
    };

    // Cancel Button
    footer.createEl("button", {
      text: "Cancel",
      cls: "oq-confirm-cancel",
      attr: {
        type: "button",
      },
    }).onclick = () => {
      this.close();
      return false;
    };
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

export default ModalConfirm;
