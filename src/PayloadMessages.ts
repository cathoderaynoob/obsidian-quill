import { PayloadMessagesType } from "@/components/Messages";

class PayloadMessages {
	payloadMessages: PayloadMessagesType[];

	constructor() {
		this.payloadMessages = this.payloadMessages || [];
	}

	getPayloadMessages(): PayloadMessagesType[] {
		return this.payloadMessages;
	}

	addMessage(message: PayloadMessagesType): PayloadMessagesType[] {
		// console.log(message);
		this.payloadMessages.push(message);
		return this.payloadMessages;
	}

	clearPayloadMessages(): void {
		this.payloadMessages = [];
	}
}

export default PayloadMessages;
