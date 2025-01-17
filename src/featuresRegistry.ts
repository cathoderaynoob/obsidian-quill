import { App, Editor, EditorPosition } from "obsidian";
import { PROMPTS } from "@/constants";
import { OutputTarget } from "@/interfaces";
import { renderToEditor } from "@/editorUtils";
import emitter from "@/customEmitter";
import ModalTextOutput from "@/components/ModalTextOutput";

export interface FeatureProperties {
	id: string;
	prompt: (inputText?: string) => string;
	processResponse: (
		response: string,
		outputTarget?: OutputTarget,
		editorPos?: EditorPosition
	) => void;
	model?: string;
	temperature?: number;
	stream?: boolean;
	filePath?: string;
	outputTarget?: OutputTarget;
}

export const FeaturesRegistry = (
	app: App
): Record<string, FeatureProperties> => {
	const registry: Record<string, FeatureProperties> = {
		// TELL A JOKE
		tellAJoke: {
			id: "tellAJoke",
			prompt: () => PROMPTS.tellAJoke.content,
			processResponse: (response: string) => {
				if (response.length) new ModalTextOutput(app, response).open();
			},
			model: "gpt-4o-mini",
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
				return `${today}: ${PROMPTS.onThisDate.content}`;
			},
			processResponse: async (
				response: string,
				editor: Editor,
				editorPos: EditorPosition
			) => {
				if (response.length) {
					await renderToEditor(response, editor, editorPos);
				}
			},
			stream: true,
			model: "gpt-4o-mini",
		},

		// Define...
		define: {
			id: "define",
			prompt: (inputText: string) => {
				return `${inputText} ${PROMPTS.define.content}`;
			},
			processResponse: async (
				response: string,
				editor: Editor,
				editorPos: EditorPosition
			) => {
				if (response.length) {
					await renderToEditor(response, editor, editorPos);
				}
			},
			stream: true,
			model: "gpt-4o",
			temperature: 0.2,
		},

		// NEW PROMPT
		newPrompt: {
			id: "newPrompt",
			prompt: (inputText: string) => inputText,
			processResponse: (response: string) =>
				emitter.emit("updateResponseMessage", response),
			stream: true,
			outputTarget: "view",
		},

		// Custom command
		customCommand: {
			id: "customCommand",
			prompt: (inputText: string) => inputText,
			processResponse: (response: string) =>
				emitter.emit("updateResponseMessage", response),
			stream: true,
			outputTarget: "view",
		},

		// SEND SELECTED TEXT WITH PROMPT
		sendPromptWithSelectedText: {
			id: "sendPromptWithSelectedText",
			prompt: (inputText: string) => inputText,
			processResponse: (response: string) =>
				emitter.emit("updateResponseMessage", response),
			stream: true,
			outputTarget: "view",
		},
	};

	return registry;
};

export const getFeatureProperties = (
	app: App,
	id: string
): FeatureProperties | null => {
	const registry = FeaturesRegistry(app);
	return registry[id] || null;
};
