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
				<div className={`gpt-message gpt-message-${role}`} data-id={dataId}>
					{role === "user" && <p className="gpt-message-user-icon"></p>}
					<div className="gpt-message-content">
						{error ? (
							<div className="gpt-message-error">{error}</div>
						) : (
							<ReactMarkdown>{message}</ReactMarkdown>
						)}
						{selectedText && (
							<div className="gpt-message-selectedtext">
								<label
									className="gpt-message-selectedtext-content"
									htmlFor={id}
								>
									<ReactMarkdown>{selectedText}</ReactMarkdown>
								</label>
								<input
									type="checkbox"
									id={id}
									className="gpt-expand-selectedtext"
								/>
							</div>
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
				</div>
			) : null}
		</>
	);
};

export default Message;
