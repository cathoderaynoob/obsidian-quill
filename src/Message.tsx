import ReactMarkdown from "react-markdown";

interface MessageProps {
	message: string;
}

// Message properties could be:
// id: number
// role: string
// type: string
// content: string
// model: string
// actions: string
// status: string
// error: string
// ...

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
