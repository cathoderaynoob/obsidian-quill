import { WorkspaceLeaf } from "obsidian";

export interface IPluginServices {
  activateView(): Promise<WorkspaceLeaf | null>;
  notifyError(errorCode: string): void;
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
