import ReactMarkdown from "react-markdown";
import { MessageType } from "./Messages";

const Message: React.FC<MessageType> = ({
	id,
	role,
	message,
	model,
	selectedText,
	error,
	// actions,
	// status,
}) => {
	if (message && role === "user") message = "**&raquo;** " + message;
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
