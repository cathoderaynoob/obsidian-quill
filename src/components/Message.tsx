import { MessageType } from "@/components/Messages";
import ReactMarkdown from "react-markdown";

interface MessageProps extends MessageType {
	dataId: string;
}
const Message: React.FC<MessageProps> = ({
	id,
	role,
	content: message,
	model,
	selectedText,
	error,
	dataId,
	// actions,
	// status,
}) => {
	return (
		<>
			{message ? (
				<div className={`oq-message oq-message-${role}`} data-id={dataId}>
					{role === "user" && <p className="oq-message-user-icon"></p>}
					<div
						className={`oq-message-content ${
							role === "assistant" ? "oq-message-streaming" : ""
						}`}
					>
						{error ? (
							<div className="oq-message-error">{error}</div>
						) : (
							<ReactMarkdown>{message}</ReactMarkdown>
						)}
						{selectedText && (
							<div className="oq-message-selectedtext">
								<label className="oq-message-selectedtext-content" htmlFor={id}>
									<ReactMarkdown>{selectedText}</ReactMarkdown>
								</label>
								<input
									type="checkbox"
									id={id}
									className="oq-expand-selectedtext"
								/>
							</div>
						)}
						{role === "assistant" && (
							<div className="oq-message-model">{model}</div>
						)}
						{/* {actions && actions.length > 0 && (
						<div className="oq-message-actions">
							{actions.map((action, index) => (
								<button
									key={index}
									className="oq-message-action"
									onClick={() => console.log(action)}
								>
									{action}
								</button>
							))}
						</div>
					)} */}
					</div>
				</div>
			) : null}
		</>
	);
};

export default Message;
