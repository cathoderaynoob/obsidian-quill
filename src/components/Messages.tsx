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
	const prevContentLengthRef = useRef<number>(0);
	const prevScrollTop = useRef<number>(0);
	const stopScrolling = useRef<boolean>(false);
	const payloadMessages = PayloadMessages.getInstance();

	const getContainerElem = (): HTMLElement | null => {
		return document.getElementById("oq-messages");
	};

	const getMessageElem = (index: number): HTMLElement | null => {
		return document.querySelector(`[data-idx="message-${index}"]`);
	};

	const saveMessages = async () => {
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

	const newConversation = async (event: React.MouseEvent<HTMLElement>) => {
		let success = false;
		if (!event.altKey) {
			success = await saveMessages();
		}
		if (success || event.altKey) {
			setMessages([]);
			payloadMessages.clearAll();
		}
	};

	// SCROLL HANDLER
	useEffect(() => {
		if (stopScrolling.current) return;

		const container = getContainerElem();
		if (!container) return;

		const handleScroll = () => {
			// Stop scrolling if the user scrolls up
			const isScrollingDown = container.scrollTop < prevScrollTop.current;
			if (isScrollingDown) {
				stopScrolling.current = true;
				return;
			}
			prevScrollTop.current = container.scrollTop;
		};
		container.addEventListener("scroll", handleScroll);

		return () => {
			container.removeEventListener("scroll", handleScroll);
		};
	}, []);

	// NEW MESSAGE
	// Add a new message to the chat when a new message is received
	useEffect(() => {
		const container = getContainerElem();
		if (!container) return;

		const handleNewMessage = (role: Role, selectedText: string) => {
			const newMessage: MessageType = {
				id: generateUniqueId(),
				role: role,
				content: "",
				model: settings.openaiModel,
				selectedText: selectedText,
			};
			latestMessageRef.current = newMessage;
			prevContentLengthRef.current = 0;
			stopScrolling.current = false;
			setMessages((prevMessages) => {
				return [...prevMessages, newMessage];
			});
			prevScrollTop.current = container.scrollTop;
			scrollToMessage(messages.length - 1);
		};
		emitter.on("newMessage", handleNewMessage);
		return () => {
			emitter.off("newMessage", handleNewMessage);
		};
	}, [messages]);

	// UPDATE MESSAGE
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

				// Scroll after a sufficient number of chars have been added
				const contentLength = latestMessageRef.current.content.length;
				if (
					contentLength >=
					prevContentLengthRef.current + SCROLL_THRESHOLD_CHARS
				) {
					scrollToMessage(messages.length - 1);
					prevContentLengthRef.current = contentLength;
				}
			}
		};
		emitter.on("updateMessage", handleUpdateMessage);
		return () => {
			emitter.off("updateMessage", handleUpdateMessage);
		};
	}, [messages]);

	// STREAM END
	// Clear the message highlight when the stream ends
	useEffect(() => {
		const handleStreamEnd = () => {
			// setTimeout is necessary when the response is minimal,
			// e.g. "1 2 3". Otherwise the highlight isn't cleared.
			setTimeout(() => {
				clearHighlights("oq-message-streaming");
				scrollToMessage(messages.length - 1);
			}, 0);
		};
		emitter.on("streamEnd", handleStreamEnd);
		return () => {
			emitter.off("streamEnd", handleStreamEnd);
		};
	}, [messages]);

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
			scrollToMessage(newIndex, true);
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

	// Generate a unique ID for each message
	const generateUniqueId = () => {
		return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
	};

	const getMessagePos = (container: HTMLElement, message: HTMLElement) => {
		let messagePos = 0;
		const containerRect = container.getBoundingClientRect();
		const messageRect = message.getBoundingClientRect();

		messagePos = messageRect.top - containerRect.top + container.scrollTop;
		return messagePos;
	};

	// Utility functions for highlighting messages
	const highlightMessage = (index: number) => {
		const messageElement = getMessageElem(index);
		messageElement?.classList.add("oq-message-highlight");
		setTimeout(() => {
			clearHighlights("oq-message-highlight");
		}, 100);
	};

	const clearHighlights = (msgClassName: string) => {
		const classSelector = `.${msgClassName}`;
		const highlightedMessages = document.querySelectorAll(classSelector);
		highlightedMessages.forEach((message) => {
			message.classList.remove(msgClassName);
		});
	};

	// Scroll to a specific message
	const scrollToMessage = (index: number, isMsgNav?: boolean): void => {
		if (!isMsgNav && stopScrolling.current) return;
		const container = getContainerElem();
		const message = getMessageElem(index);
		if (!container || !message) return;

		const titleBarHeight =
			document.getElementById("oq-view-title")?.offsetHeight || 0;
		const messagePadHeight =
			document.getElementById("oq-message-pad")?.offsetHeight || 0;
		const viewPortHeight =
			container.offsetHeight - titleBarHeight - messagePadHeight;

		// If the message is taller than the viewable area,
		// scroll the message to the top of the view port
		if (message.offsetHeight >= viewPortHeight) {
			const messagePos = getMessagePos(container, message);
			if (!messagePos) return;

			// 12 corresponds to #oq-messages padding-top
			const scrollToPosition = messagePos - titleBarHeight - 12;
			container.scrollTo({
				top: scrollToPosition,
				behavior: "smooth",
			});
		}
		// Otherwise, scroll the message into view, centered
		else {
			message.scrollIntoView({
				block: "center",
				behavior: "smooth",
			});
		}
	};

	// Render the messages
	return (
		<>
			<div id="oq-messages">
				<TitleBar newChat={newConversation} />
				{messages.map((message, index) => (
					<Message key={message.id} {...message} dataIdx={`message-${index}`} />
				))}
			</div>
		</>
	);
};

export default Messages;
