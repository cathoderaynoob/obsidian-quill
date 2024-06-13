import { PayloadMessagesType } from "@/components/Messages";

export interface IPluginServices {
	toggleView(): Promise<void>;
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
