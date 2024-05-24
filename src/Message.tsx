import ReactMarkdown from "react-markdown";
import { MessageType } from "./Messages";

const Message: React.FC<MessageType> = ({
	id,
	role,
	message,
	model,
	error,
	// actions,
	// status,
}) => {
	return (
		<>
			{message ? (
				<div className={`gpt-message gpt-message-${role}`}>
					{error ? (
						<div className="gpt-message-error">{error}</div>
					) : (
						<ReactMarkdown>{message}</ReactMarkdown>
					)}
					{model && role === "system" && (
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
