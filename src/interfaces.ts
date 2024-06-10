import { PayloadMessagesType } from "@/components/Messages";
import GptView from "@/components/view";

export interface IPluginServices {
	toggleView(): Promise<GptView | null>;
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
