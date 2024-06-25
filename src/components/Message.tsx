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
				<div className={`quill-message quill-message-${role}`} data-id={dataId}>
					{role === "user" && <p className="quill-message-user-icon"></p>}
					<div className="quill-message-content">
						{error ? (
							<div className="quill-message-error">{error}</div>
						) : (
							<ReactMarkdown>{message}</ReactMarkdown>
						)}
						{selectedText && (
							<div className="quill-message-selectedtext">
								<label
									className="quill-message-selectedtext-content"
									htmlFor={id}
								>
									<ReactMarkdown>{selectedText}</ReactMarkdown>
								</label>
								<input
									type="checkbox"
									id={id}
									className="quill-expand-selectedtext"
								/>
							</div>
						)}
						{role === "assistant" && (
							<div className="quill-message-model">{model}</div>
						)}
						{/* {actions && actions.length > 0 && (
						<div className="quill-message-actions">
							{actions.map((action, index) => (
								<button
									key={index}
									className="quill-message-action"
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
