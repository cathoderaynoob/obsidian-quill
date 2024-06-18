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
	const { settings, apiService } = usePluginContext();
	const [messages, setMessages] = useState<MessageType[]>([]);
	const [currentIndex, setCurrentIndex] = useState(0);
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

	const scrollToMessage = (index: number, isLast?: boolean) => {
		const messageElement = document.querySelector(
			`[data-id="message-${index}"]`
		);
		if (messageElement) {
			if (isLast) {
				messageElement.parentElement?.scrollBy({
					top: 20,
					behavior: "smooth",
				});
			} else {
				messageElement.scrollIntoView({
					behavior: "smooth",
					block: "start",
				});
			}
		}
	};

	// Event listener for the escape key
	useEffect(() => {
		const handleMessagesKeypress = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				apiService.cancelStream();
			}
			// Scroll down to next message
			if (event.key === "j") {
				event.preventDefault();
				setCurrentIndex((prevIndex) => {
					// 1. If prevIndex is at the last message...
					const isLast = prevIndex === messages.length - 1;
					if (isLast) {
						// 2. then (a) don't set new index, and scroll to block: end
						scrollToMessage(prevIndex, isLast);
						return prevIndex;
					}
					// 3. Else (a) set new index and scroll to start of next message
					const newIndex = Math.min(prevIndex + 1, messages.length - 1);
					scrollToMessage(newIndex);
					return newIndex;
				});
			}
			// Scroll up to previous message
			if (event.key === "k") {
				event.preventDefault();
				setCurrentIndex((prevIndex) => {
					const newIndex = Math.max(prevIndex - 1, 0);
					scrollToMessage(newIndex);
					return newIndex;
				});
			}
		};
		emitter.on("keydown", handleMessagesKeypress);

		return () => {
			emitter.off("keydown", handleMessagesKeypress); // Clean up
		};
	}, [apiService, messages.length]);

	return (
		<div id="gpt-messages">
			{messages.map((message, index) => (
				<Message key={message.id} {...message} dataId={`message-${index}`} />
			))}
			<div style={{ height: "90vh" }}></div>
		</div>
	);
};

export default Messages;
