import { Editor } from "obsidian";
import { GptTextOutputModal } from "@/modals";
import GptView from "@/view";

export type ContainerType = HTMLElement | Editor | GptTextOutputModal | GptView;

export interface IPluginServices {
	activateView(): Promise<GptView | null>;
	notifyError(errorCode: string, consoleMsg?: string): void;
}

export interface GptEngines {
	id: string;
	ready: boolean;
	owner: string;
}

export interface GptRequestPayload {
	model: string;
	messages: {
		role: "user" | "system";
		content: string;
	}[];
	stream?: boolean;
	temperature: number;
}

export interface GptChatResponse {
	success: boolean;
	message: string;
	error?: string;
}

export interface OpenAIAPIResponse {
	body: ReadableStream<Uint8Array> | null;
	ok: boolean;
	status: number;
	statusText: string;
	url: string;
}

export interface FeatureProperties {
	id: string;
	buildPrompt: (inputText?: string) => string;
	processResponse: (
		response: string,
		container?: ContainerType,
		gptView?: GptView
	) => void;
	model?: string;
	temperature?: number;
	stream?: boolean;
	container?: ContainerType;
}
