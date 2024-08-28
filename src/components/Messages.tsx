import { useEffect, useRef, useState } from "react";
import { usePluginContext } from "@/components/PluginContext";
import { Role } from "@/interfaces";
import emitter from "@/customEmitter";
import Message, { MessageType } from "@/components/Message";
import PayloadMessages from "@/PayloadMessages";
import TitleBar from "@/components/TitleBar";

const Messages: React.FC = () => {
	const SCROLL_THRESHOLD_CHARS = 400;
	const { settings, apiService, pluginServices, vault, vaultUtils } =
		usePluginContext();
	const [messages, setMessages] = useState<MessageType[]>([]);
	const [, setCurrentIndex] = useState(0);
	const latestMessageRef = useRef<MessageType | null>(null);
	const lastScrollPositionRef = useRef(0);
	const payloadMessages = PayloadMessages.getInstance();

	const newChat = async (event: React.MouseEvent<HTMLElement>) => {
		let success = false;
		if (!event.altKey) {
			success = await saveMessages();
		}
		if (success || event.altKey) {
			setMessages([]);
			payloadMessages.clearAll();
		}
	};

	const saveMessages = async () => {
		// const messages = payloadMessages.getAll(false);
		if (messages.length) {
			const filename = await vaultUtils.saveConversationToFile(
				messages,
				vault,
				settings,
				pluginServices
			);
			return !!filename;
		} else {
			return false;
		}
	};

	// Add a new message
	useEffect(() => {
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

	// Update the most recent message with streaming content from the API.
	useEffect(() => {
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

				const currentLength = latestMessageRef.current.content.length;
				if (
					currentLength >=
					lastScrollPositionRef.current + SCROLL_THRESHOLD_CHARS
				) {
					console.log(
						'document.getElementById("oq-messages")?.scrollTop',
						document.getElementById("oq-messages")?.scrollTop
					);
					console.log(
						"lastScrollPositionRef.current",
						lastScrollPositionRef.current
					);
					scrollToBottom();
					lastScrollPositionRef.current = currentLength;
				}
			}
		};
		emitter.on("updateMessage", handleUpdateMessage);
		return () => {
			emitter.off("updateMessage", handleUpdateMessage);
		};
	}, []);

	// Clear the message highlight when the stream ends
	useEffect(() => {
		const handleStreamEnd = () => {
			// setTimeout is necessary when the response is minimal, e.g. "1 2 3".
			// Otherwise the highlight isn't cleared.
			setTimeout(() => {
				clearHighlights("oq-message-streaming");
				lastScrollPositionRef.current = 0;
				scrollToBottom();
			}, 0);
		};
		emitter.on("streamEnd", handleStreamEnd);
		return () => {
			emitter.off("streamEnd", handleStreamEnd);
		};
	}, []);

	// Scroll to bottom when the assistant sends a message
	useEffect(() => {
		if (messages.length > 0 && latestMessageRef.current?.role === "assistant") {
			const timer = setTimeout(() => {
				scrollToBottom();
			}, 0);
			return () => clearTimeout(timer);
		}
	}, [messages.length]);

	// Control the message navigation
	const goToMessage = (nav: "next" | "prev" | "first" | "last") => {
		setCurrentIndex((prevIndex) => {
			let newIndex = prevIndex;
			switch (nav) {
				case "next":
					newIndex = Math.min(messages.length - 1, prevIndex + 1);
					break;
				case "prev":
					newIndex = Math.max(0, prevIndex - 1);
					break;
				case "first":
					newIndex = 0;
					break;
				case "last":
					newIndex = messages.length - 1;
					break;
			}
			scrollToMessage(newIndex);
			clearHighlights("oq-message-highlight");
			highlightMessage(newIndex);
			return newIndex;
		});
	};

	// Keyboard navigation for messages
	const handleMessagesKeypress = (event: KeyboardEvent) => {
		const promptElem = document.getElementsByClassName("oq-prompt-input")[0];
		if (document.activeElement !== promptElem) {
			switch (event.key) {
				case "j":
					event.preventDefault();
					goToMessage("next");
					break;
				case "k":
					event.preventDefault();
					goToMessage("prev");
					break;
				case "f":
					event.preventDefault();
					goToMessage("first");
					break;
				case "l":
					event.preventDefault();
					goToMessage("last");
					break;
			}
		}
		// Cancel the stream if the user presses the "Escape" key
		if (event.key === "Escape") {
			event.preventDefault();
			apiService.cancelStream();
		}
	};

	// Add event listener for keyboard navigation
	useEffect(() => {
		const activeViewElem = pluginServices.getViewElem();
		activeViewElem?.addEventListener("keydown", handleMessagesKeypress);
		return () => {
			activeViewElem?.removeEventListener("keydown", handleMessagesKeypress);
		};
	}, [apiService, pluginServices, messages.length]);

	// Render the messages
	return (
		<>
			<div id="oq-messages">
				<TitleBar newChat={newChat} />
				{messages.map((message, index) => (
					<Message key={message.id} {...message} dataIdx={`message-${index}`} />
				))}
				<div id="oq-messages-shim" />
			</div>
		</>
	);
};

// Generate a unique ID for each message
const generateUniqueId = () => {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

// Scroll to a specific message
export const scrollToMessage = (index: number) => {
	const container = document.getElementById("oq-messages");
	const message = document.querySelector(
		`[data-idx="message-${index}"]`
	) as HTMLElement;
	if (!container || !message) return;
	const titleBar = document.getElementById("oq-view-title");
	const titleBarHeight = titleBar?.offsetHeight || 40;

	const messagePos = getMessagePos(container, message);

	if (!messagePos) return;

	// 12 corresponds to oq-messages padding-top
	const scrollToPosition = messagePos - titleBarHeight - 12;

	// If the message is taller than the chat container,
	// scroll the message to the top of the container
	if (message.offsetHeight > container.offsetHeight) {
		container.scrollTo({
			top: scrollToPosition,
			behavior: "smooth",
		});
	} else {
		// Otherwise, scroll the message into view, centered
		message.scrollIntoView({
			block: "center",
			behavior: "smooth",
		});
	}
};

const getMessagePos = (container: HTMLElement, message: HTMLElement) => {
	let messagePos = 0;
	const containerRect = container.getBoundingClientRect();
	const messageRect = message.getBoundingClientRect();

	messagePos = messageRect.top - containerRect.top + container.scrollTop;
	return messagePos;
};

const scrollToBottom = () => {
	const bottom = document.getElementById("oq-messages-shim");
	bottom?.scrollIntoView({ behavior: "smooth" });
};

// Utility functions for highlighting messages
export const highlightMessage = (index: number) => {
	const messageElement = document.querySelector(
		`[data-idx="message-${index}"]`
	);
	messageElement?.classList.add("oq-message-highlight");
	setTimeout(() => {
		clearHighlights("oq-message-highlight");
	}, 100);
};

export const clearHighlights = (msgClassName: string) => {
	const classSelector = `.${msgClassName}`;
	const highlightedMessages = document.querySelectorAll(classSelector);
	highlightedMessages.forEach((message) => {
		message.classList.remove(msgClassName);
	});
};

export default Messages;
