import { useEffect, useRef, useState } from "react";
import { usePluginContext } from "@/components/PluginContext";
import { Role } from "@/interfaces";
import emitter from "@/customEmitter";
import Message from "@/components/Message";

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
	const { settings, apiService, pluginServices } = usePluginContext();
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
					block: "start",
					behavior: "smooth",
				});
			}
		}
	};

	const goToMessage = (direction: "next" | "prev") => {
		let isLast = false;
		setCurrentIndex((prevIndex) => {
			let newIndex = prevIndex;
			switch (direction) {
				case "next":
					isLast = prevIndex === messages.length - 1;
					newIndex = isLast ? prevIndex : prevIndex + 1;
					break;
				case "prev":
					newIndex = Math.max(0, prevIndex - 1);
			}
			scrollToMessage(newIndex, isLast);
			return newIndex;
		});
	};

	const handleMessagesKeypress = (event: KeyboardEvent) => {
		// 'j' and 'k' keys to navigate messages, unless
		// the user is typing in the prompt input
		const promptElem = document.getElementsByClassName("quill-prompt-input")[0];
		if (document.activeElement !== promptElem) {
			if (event.key === "j") {
				event.preventDefault();
				goToMessage("next");
			}
			if (event.key === "k") {
				event.preventDefault();
				goToMessage("prev");
			}
		}
		// Cancel the stream if the user presses the "Escape" key
		if (event.key === "Escape") {
			event.preventDefault();
			apiService.cancelStream();
		}
	};
	useEffect(() => {
		const activeViewElem = pluginServices.getViewElem();
		activeViewElem?.addEventListener("keydown", handleMessagesKeypress);

		return () => {
			activeViewElem?.removeEventListener("keydown", handleMessagesKeypress);
		};
	}, [apiService, pluginServices, messages.length]);

	return (
		<div id="quill-messages">
			{messages.map((message, index) => (
				<Message key={message.id} {...message} dataId={`message-${index}`} />
			))}
			<div style={{ height: "90svh" }}></div>
		</div>
	);
};

export default Messages;
