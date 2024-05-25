import React, { useEffect, useRef, useState } from "react";
import { usePluginContext } from "@/PluginContext";
import Message from "@/Message";
import emitter from "@/customEmitter";

export interface MessageType {
	id: string;
	role: string;
	message: string;
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
	const { pluginServices, apiService, settings } = usePluginContext();
	const [messages, setMessages] = useState<MessageType[]>([]);
	const latestMessageRef = useRef<MessageType | null>(null);

	useEffect(() => {
		// Adds a new message. When a new message prompt is initiated,
		// a new message is added to the messages array.
		const handleNewMessage = (role: string, selectedText: string) => {
			const newMessage: MessageType = {
				id: generateUniqueId(),
				role: role,
				message: "",
				model: settings.openaiModel,
				selectedText: selectedText,
			};
			latestMessageRef.current = newMessage;
			setMessages((prevMessages) => [...prevMessages, newMessage]);
		};
		emitter.on("newMessage", handleNewMessage);

		// Update the most recent message with streaming content from the API.
		const handleUpdateMessage = (response: string) => {
			console.log(response);
			if (latestMessageRef.current) {
				latestMessageRef.current.message += response;
				setMessages((prevMessages) => {
					const updatedMessages = [...prevMessages];
					updatedMessages[updatedMessages.length - 1] = {
						...(latestMessageRef.current as MessageType),
					};
					return updatedMessages;
				});
				return;
			}
			setMessages((prevMessages) => {
				const updatedMessages = [...prevMessages];
				updatedMessages[updatedMessages.length - 1].message += response;
				return updatedMessages;
			});
		};
		emitter.on("updateMessage", handleUpdateMessage);

		return () => {
			emitter.off("newMessage", handleNewMessage);
			emitter.off("updateMessage", handleUpdateMessage);
		};
	}, [pluginServices, apiService, settings]);

	return (
		<div className="gpt-messages">
			{messages.map((message) => (
				<Message key={message.id} {...message} />
			))}
		</div>
	);
};

export default Messages;
