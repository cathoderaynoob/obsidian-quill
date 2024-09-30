import { useEffect, useRef, useState } from "react";
import { usePluginContext } from "@/components/PluginContext";
import { Role } from "@/interfaces";
import { SCROLL_CHARS_LIMIT } from "@/constants";
import emitter from "@/customEmitter";
import Message, { MessageType } from "@/components/Message";
import PayloadMessages from "@/PayloadMessages";
import TitleBar from "@/components/TitleBar";

const Messages: React.FC = () => {
	const { settings, apiService, pluginServices, vaultUtils } =
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
		return document.querySelector(`[conv-idx="${index}"]`);
	};

	const clearMessages = (): void => {
		setMessages([]);
		payloadMessages.clearAll();
		if (latestMessageRef.current)
			latestMessageRef.current.conversationId = null;
	};

	// Unique ID used for each conversation and message
	const generateUniqueId = () => {
		return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
	};

	// NEW CONVERSATION =========================================================
	const newConversation = async (event?: React.MouseEvent<HTMLElement>) => {
		// Skip if alt+click. Save convo for all other use cases.
		// const skipSave = event ? event.altKey : false;
		// const success = skipSave || (await saveConversation());
		// if (success) {
		apiService.cancelStream(); // When new convo started during a response
		clearMessages();
		// }
		(document.querySelector(".oq-prompt-input") as HTMLElement)?.focus();
	};

	const getConversationId = (): string => {
		const conversationId =
			latestMessageRef.current?.conversationId || vaultUtils.getDateTime();
		return conversationId;
	};

	const saveConversation = async (
		updatedMessage: MessageType
	): Promise<boolean> => {
		if (!settings.saveConversations) return false;
		if (updatedMessage) {
			// Allow time for scrolling, etc. to complete, which this can interrupt
			setTimeout(async () => {
				const filename = await vaultUtils.appendLatestMessageToFile(
					getConversationId(),
					updatedMessage
				);
				if (!filename) return false;
			}, 1500);
			return true;
		} else {
			return false;
		}
	};

	// NEW MESSAGE ==============================================================
	// Adds a new message to the conversation, but
	// does not include content of message (see `handleupdateResponseMessage`)
	useEffect(() => {
		const containerElem = getContainerElem();
		if (!containerElem) return;

		const handleNewMessage = async (
			role: Role,
			inputText: string,
			selectedText: string
		): Promise<void> => {
			const newMessage: MessageType = {
				conversationId: getConversationId(),
				convIdx: messages.length + 1,
				id: generateUniqueId(),
				role: role,
				content: inputText || "",
				model: settings.openaiModel,
				selectedText: selectedText,
			};
			latestMessageRef.current = newMessage;
			prevContentLengthRef.current = 0;
			stopScrolling.current = false;

			setMessages((prevMessages) => {
				return [...prevMessages, newMessage];
			});
			prevScrollTop.current = containerElem.scrollTop;
			scrollToMessage(messages.length - 1);
			if (role === "user") saveConversation(newMessage);
		};

		emitter.on("newMessage", handleNewMessage);
		return () => {
			emitter.off("newMessage", handleNewMessage);
		};
	}, [messages]);

	// UPDATE MESSAGE ===========================================================
	// Update the most recent message with streaming content from the API.
	useEffect(() => {
		const handleResponseMessage = async (response: string) => {
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
					prevContentLengthRef.current + SCROLL_CHARS_LIMIT
				) {
					await scrollToMessage(messages.length - 1);
					prevContentLengthRef.current = contentLength;
				}
			}
		};
		emitter.on("updateResponseMessage", handleResponseMessage);
		return () => {
			emitter.off("updateResponseMessage", handleResponseMessage);
		};
	}, [messages]);

	// STREAM END ===============================================================
	useEffect(() => {
		const handleStreamEnd = () => {
			enableSend();
			clearHighlights("oq-message-streaming");
			scrollToMessage(messages.length - 1);
			saveConversation(messages[messages.length - 1]);
		};
		emitter.on("streamEnd", handleStreamEnd);
		return () => {
			emitter.off("streamEnd", handleStreamEnd);
		};
	}, [messages]);

	// SCROLL HANDLING ==========================================================
	useEffect(() => {
		const containerElem = getContainerElem();
		if (stopScrolling.current || !containerElem) return;

		const handleScroll = () => {
			// Stop scrolling if the user scrolls up
			const isScrollingUp = containerElem.scrollTop < prevScrollTop.current;
			if (isScrollingUp) {
				stopScrolling.current = true;
				return;
			}
			prevScrollTop.current = containerElem.scrollTop;
		};
		containerElem.addEventListener("scroll", handleScroll);

		return () => {
			containerElem.removeEventListener("scroll", handleScroll);
		};
	}, []);

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
		const promptElem = document.querySelector(
			".oq-prompt-input"
		) as HTMLElement;
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
				case "b":
					event.preventDefault();
					scrollToBottom();
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

	const getMessagePos = (
		containerElem: HTMLElement,
		message: HTMLElement
	): number => {
		let messagePos = 0;
		if (!containerElem) return messagePos;
		const containerRect = containerElem.getBoundingClientRect();
		const messageRect = message.getBoundingClientRect();

		messagePos = messageRect.top - containerRect.top + containerElem.scrollTop;
		return messagePos;
	};

	// Scroll to a specific message
	const scrollToMessage = async (
		index: number,
		isMsgNav?: boolean
	): Promise<void> => {
		if (!isMsgNav && stopScrolling.current) return;
		const containerElem = getContainerElem();
		const message = getMessageElem(index);
		if (!containerElem || !message) return;

		// If the message is taller than the viewable area,
		// scroll the message to the top of the view port
		if (message.offsetHeight >= containerElem.offsetHeight) {
			const messagePos = getMessagePos(containerElem, message);
			const scrollToPosition = messagePos - 16;
			containerElem.scrollTo({
				top: scrollToPosition,
				behavior: "smooth",
			});
			stopScrolling.current = true;
		}
		// Otherwise, scroll the message into view, centered
		else {
			message.scrollIntoView({
				block: "center",
				behavior: "smooth",
			});
		}
	};

	const scrollToBottom = () => {
		const containerElem = getContainerElem();
		containerElem?.scrollTo({
			top: containerElem.scrollHeight,
			behavior: "smooth",
		});
	};

	const handleCollapseSelectedText = (index: number) => {
		const containerElem = getContainerElem();
		const message = getMessageElem(index);
		if (!(message && containerElem)) return;
		if (
			message.offsetHeight > containerElem.offsetHeight ||
			containerElem.scrollTop > message.offsetTop
		) {
			scrollToMessage(index, true);
		}
	};

	// Utility functions for highlighting messages ==============================
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

	const enableSend = () => {
		const messagePad = document.getElementById("oq-message-pad");
		const inputElem = messagePad?.querySelector(
			".oq-prompt-send"
		) as HTMLButtonElement;
		inputElem.disabled = false;
	};

	// Render the messages
	return (
		<>
			<TitleBar newConversation={newConversation} />
			<div id="oq-messages">
				{messages.map((message, index) => (
					<Message
						key={message.id}
						{...message}
						convIdx={index}
						handleOnCollapse={handleCollapseSelectedText}
					/>
				))}
			</div>
		</>
	);
};

export default Messages;
