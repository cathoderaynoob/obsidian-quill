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

	getPayloadMessages(): PayloadMessagesType[] {
		return this.payloadMessages;
	}

	getLatestPayloadMessage(): PayloadMessagesType {
		return this.payloadMessages[this.payloadMessages.length - 1];
	}

	addMessage(message: PayloadMessagesType): PayloadMessagesType[] {
		this.payloadMessages.push(message);
		return this.payloadMessages;
	}

	clearPayloadMessages(): void {
		this.payloadMessages = [];
	}
}

export default PayloadMessages;
