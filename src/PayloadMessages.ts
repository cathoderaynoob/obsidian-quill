import { PayloadMessagesType } from "@/components/Messages";

class PayloadMessages {
	payloadMessages: PayloadMessagesType[];

	constructor() {
		this.payloadMessages = [];
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
