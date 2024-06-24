export interface IPluginServices {
	toggleView(): Promise<void>;
	getViewElem(): HTMLElement | null;
	notifyError(errorCode: string, consoleMsg?: string): void;
}

export interface GptEngines {
	id: string;
	ready: boolean;
	owner: string;
}

export interface GptRequestPayload {
	model: string;
	messages: PayloadMessagesType[];
	temperature: number;
}

export type Role = "system" | "user" | "assistant";
export interface PayloadMessagesType {
	role: Role;
	content: string;
}