import { Editor, WorkspaceLeaf } from "obsidian";
import { GptTextOutputModal } from "@/modals";

export type ContainerType = HTMLElement | Editor | GptTextOutputModal | WorkspaceLeaf

export interface IPluginServices {
	activateView(): Promise<WorkspaceLeaf | null>;
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
	processResponse: (response: string, container?: ContainerType) => void;
	model?: string;
	temperature?: number;
	stream?: boolean;
	container?: ContainerType;
}
