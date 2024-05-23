import React, { useEffect, useState } from "react";
import { usePluginContext } from "@/PluginContext";
import Message from "@/Message";
import emitter from "@/customEmitter";

const Messages: React.FC = () => {
	const { apiService, settings } = usePluginContext();
	const [messages, setMessages] = useState<string[]>([""]);

	useEffect(() => {
		// Adds a new message. When a new message prompt is initiated,
		// it adds an empty string to the messages state array.
		const handleNewMessage = () => {
			console.log("newMessage");
			setMessages((prevMessages) => [...prevMessages, ""]);
		};
		emitter.on("newMessage", handleNewMessage);

		// Update the most recent message with streaming content from
		// the API. Appends new content to the last message in the
		// messages array.
		const handleUpdateMessage = (response: string) => {
			setMessages((prevMessages) => {
				const updatedMessages = [...prevMessages];
				updatedMessages[updatedMessages.length - 1] += response;
				return updatedMessages;
			});
		};
		emitter.on("updateMessage", handleUpdateMessage);

		return () => {
			emitter.off("newMessage", handleNewMessage);
			emitter.off("updateMessage", handleUpdateMessage);
		};
	}, [apiService, settings]);

	return (
		<div className="gpt-messages">
			{messages.map((message, index) => (
				<Message key={index} message={message} />
			))}
		</div>
	);
};

export default Messages;

// Message properties could be:
// id: number
// role: string
// type: string
// content: string
// model: string
// actions: string
// status: string
// error: string
//
