import { ItemView, Notice, WorkspaceLeaf } from "obsidian";
import { ERROR_MESSAGES, GPT_VIEW_TYPE } from "@/constants";
import { h, Fragment, render } from "preact";

export default class GptView extends ItemView {
	engines: string[] = [];

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return GPT_VIEW_TYPE;
	}

	getIcon(): string {
		return "message-square";
	}

	getDisplayText(): string {
		return "GPT Chat";
	}

	async onOpen(): Promise<void> {
		const root = this.containerEl.children[1] as HTMLElement;
		render(
			<>
				<h4 className="gpt-view-title">GPT Chat</h4>
			</>,
			root
		);
	}

	renderEngines(container: HTMLElement) {
		const enginesContainer = container.createEl("div");
		const engines = this.engines;
		const clearEngines = () => {
			const elem = document.getElementById("gpt-engines");
			if (elem) {
				elem.remove();
			}
		};

		render(
			engines.length > 0 ? (
				<div id="gpt-engines">
					<ul>
						{engines.map((engine) => (
							<li key={engine}>{engine}</li>
						))}
					</ul>
					<button onClick={clearEngines}>Clear</button>
				</div>
			) : (
				new Notice(ERROR_MESSAGES.noEngines)
			),
			enginesContainer
		);
	}

	updateEngines(engines: string[]) {
		this.engines = engines;
		if (this.containerEl.children.length > 1) {
			this.renderEngines(this.containerEl.children[1] as HTMLElement);
		}
	}

	displayContent(content: string) {
		const container = this.containerEl.children[1] as HTMLElement;
		container.createEl("p", { text: content });
	}

	async onClose(): Promise<void> {
		const container = this.containerEl.children[1];
		container.empty();
	}
}
