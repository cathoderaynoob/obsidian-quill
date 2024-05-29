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
		role: "system" | "user" | "assistant";
		content: string;
	}[];
	stream?: boolean;
	temperature: number;
}
