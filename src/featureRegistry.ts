import { App, Editor } from "obsidian";
import { PROMPTS } from "@/constants";
import { GptTextOutputModal } from "@/components/modals";
import { renderToEditor } from "@/editorUtils";
import emitter from "@/customEmitter";

export interface FeatureProperties {
	id: string;
	prompt: (inputText?: string) => string;
	processResponse: (response: string, targetEditor?: Editor) => void;
	model?: string;
	temperature?: number;
	stream?: boolean;
	targetContainer?: "view" | "modal";
}

export const createFeatureRegistry = (
	app: App
): Record<string, FeatureProperties> => ({
	// TELL A JOKE
	tellAJoke: {
		id: "tellAJoke",
		prompt: () => PROMPTS.tellAJoke.content,
		processResponse: (response) => {
			if (response.length) new GptTextOutputModal(app, response).open();
		},
	},

	// ON THIS DATE
	onThisDate: {
		id: "onThisDate",
		prompt: () => {
			const today = new Date().toLocaleDateString("en-US", {
				month: "long",
				day: "numeric",
				year: "numeric",
			});
			return `${today}: ` + PROMPTS.onThisDate.content;
		},
		processResponse: async (response, editor: Editor) => {
			if (response.length) {
				await renderToEditor(response, editor);
			}
		},
		stream: true,
	},

	// Define...
	define: {
		id: "define",
		prompt: (inputText: string) => {
			return `${inputText} ${PROMPTS.define.content}`;
		},
		processResponse: async (response, editor: Editor) => {
			if (response.length) {
				await renderToEditor(response, editor);
			}
		},
		stream: true,
	},

	// NEW PROMPT
	newPrompt: {
		id: "newPrompt",
		prompt: (inputText: string) => inputText,
		processResponse: (responseText: string) =>
			emitter.emit("updateMessage", responseText),
		stream: true,
		targetContainer: "view",
	},

	// SEND SELECTED TEXT WITH PROMPT
	sendPromptWithSelectedText: {
		id: "sendPromptWithSelectedText",
		prompt: (inputText: string) => inputText,
		processResponse: (responseText: string) =>
			emitter.emit("updateMessage", responseText),
		stream: true,
		targetContainer: "view",
	},
});
