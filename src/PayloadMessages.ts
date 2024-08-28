import { PayloadMessagesType } from "@/interfaces";

class PayloadMessages {
	payloadMessages: PayloadMessagesType[];
	public static instance: PayloadMessages;

	constructor() {
		this.payloadMessages = [];
	}

	static getInstance(): PayloadMessages {
		if (!PayloadMessages.instance) {
			PayloadMessages.instance = new PayloadMessages();
		}
		return PayloadMessages.instance;
	}

	getAll(includeSys?: boolean): PayloadMessagesType[] {
		if (includeSys) {
			return [...this.payloadMessages];
		} else {
			return this.payloadMessages.filter(
				(message) => message.role !== "system"
			);
		}
	}

	get(): PayloadMessagesType[] {
		return [...this.payloadMessages];
	}

	getLatestMessage(): PayloadMessagesType | null {
		if (this.payloadMessages.length === 0) return null;
		return { ...this.payloadMessages[this.payloadMessages.length - 1] };
	}

	addMessage(message: PayloadMessagesType): PayloadMessagesType[] {
		this.payloadMessages.push(message);
		return this.payloadMessages;
	}

	clearAll(): void {
		this.payloadMessages = [];
	}
}

export default PayloadMessages;
