import { App, Modal } from "obsidian";
import { Root, createRoot } from "react-dom/client";

// SIMPLE TEXT OUTPUT MODAL ===================================================
class ModalTextOutput extends Modal {
	textOutput: string;
	modalRoot: Root | null = null;

	constructor(app: App, textOutput: string) {
		super(app);
		this.textOutput = textOutput;
	}

	onOpen() {
		this.modalRoot = createRoot(this.contentEl);
		this.modalRoot.render(<div id="oq-output-modal">{this.textOutput}</div>);
	}

	onClose() {
		this.modalRoot?.unmount();
		this.contentEl.empty();
	}
}

export default ModalTextOutput;
