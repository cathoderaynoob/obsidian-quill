import { Editor } from "obsidian";
import { GptTextOutputModal } from "@/components/modals";
import { PayloadMessagesType } from "@/components/Messages";
import GptView from "@/components/view";

export type ContainerType = HTMLElement | Editor | GptTextOutputModal | GptView;

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
