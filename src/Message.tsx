import ReactMarkdown from "react-markdown";

interface MessageProps {
	message: string;
}

const Message: React.FC<MessageProps> = ({ message }) => {
	return (
		<>
			{message ? (
				<div className="gpt-message">
					<ReactMarkdown>{message}</ReactMarkdown>
				</div>
			) : null}
		</>
	);
};

export default Message;
