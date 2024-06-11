import { useEffect } from "react";
import { MessageType } from "./Messages";
import { usePluginContext } from "@/components/PluginContext";
import emitter from "@/customEmitter";
import ReactMarkdown from "react-markdown";

const Message: React.FC<MessageType> = ({
	id,
	role,
	content: message,
	model,
	selectedText,
	error,
	// actions,
	// status,
}) => {
	const { apiService } = usePluginContext();

	// Event listener for the escape key
	useEffect(() => {
		const handleEscapePress = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				apiService.cancelStream();
			}
		};
		emitter.on("keydown", handleEscapePress);

		return () => {
			emitter.off("keydown", handleEscapePress); // Clean up
		};
	}, [apiService]);

	return (
		<>
			{message ? (
				<div className={`gpt-message gpt-message-${role}`}>
					{selectedText && (
						<div className="gpt-message-selectedtext">
							<label className="gpt-message-selectedtext-content" htmlFor={id}>
								<ReactMarkdown>{selectedText}</ReactMarkdown>
							</label>
							<input
								type="checkbox"
								id={id}
								className="gpt-expand-selectedtext"
							/>
						</div>
					)}
					{error ? (
						<div className="gpt-message-error">{error}</div>
					) : (
						<ReactMarkdown>{message}</ReactMarkdown>
					)}
					{role === "assistant" && (
						<div className="gpt-message-model">{model}</div>
					)}
					{/* {actions && actions.length > 0 && (
						<div className="gpt-message-actions">
							{actions.map((action, index) => (
								<button
									key={index}
									className="gpt-message-action"
									onClick={() => console.log(action)}
								>
									{action}
								</button>
							))}
						</div>
					)} */}
				</div>
			) : null}
		</>
	);
};

export default Message;
