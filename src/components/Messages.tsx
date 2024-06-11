import { useEffect, useRef, useState } from "react";
import { usePluginContext } from "@/components/PluginContext";
import emitter from "@/customEmitter";
import Message from "@/components/Message";

export type Role = "system" | "user" | "assistant";
export interface PayloadMessagesType {
	role: Role;
	content: string;
}
export interface MessageType {
	id: string;
	role: Role;
	content: string;
	model: string;
	selectedText?: string;
	error?: string;
	// actions?: string[];
	// status?: string;
}

const generateUniqueId = () => {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

const Messages: React.FC = () => {
	const { settings } = usePluginContext();
	const [messages, setMessages] = useState<MessageType[]>([]);
	// `useRef` maintains a reference to the most recent message object
	// across re-renders, so that the latest message can be updated with
	// streaming content from the API.
	const latestMessageRef = useRef<MessageType | null>(null);

	useEffect(() => {
		// Adds a new message. When a new message prompt is initiated,
		// a new message is added to the messages array.
		const handleNewMessage = (role: Role, selectedText: string) => {
			const newMessage: MessageType = {
				id: generateUniqueId(),
				role: role,
				content: "",
				model: settings.openaiModel,
				selectedText: selectedText,
			};
			latestMessageRef.current = newMessage;
			setMessages((prevMessages) => {
				const updatedMessages = [...prevMessages, newMessage];
				return updatedMessages;
			});
		};
		emitter.on("newMessage", handleNewMessage);

		return () => {
			emitter.off("newMessage", handleNewMessage);
		};
	}, []);

	useEffect(() => {
		// Update the most recent message with streaming content from the API.
		const handleUpdateMessage = (response: string) => {
			if (latestMessageRef.current) {
				latestMessageRef.current.content += response;
				setMessages((prevMessages) => {
					const updatedMessages = [...prevMessages];
					updatedMessages[updatedMessages.length - 1] = {
						...(latestMessageRef.current as MessageType),
					};
					return updatedMessages;
				});
			}
		};
		emitter.on("updateMessage", handleUpdateMessage);

		return () => {
			emitter.off("updateMessage", handleUpdateMessage);
		};
	}, []);

	return (
		<div id="gpt-messages">
			{messages.map((message) => (
				<Message key={message.id} {...message} />
			))}
		</div>
	);
};

export default Messages;
