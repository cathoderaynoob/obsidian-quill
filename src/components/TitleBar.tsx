interface TitleBarProps {
	newConversation: (event: React.MouseEvent<HTMLElement>) => void;
}

const TitleBar: React.FC<TitleBarProps> = ({ newConversation }) => {
	return (
		<div id="oq-view-title">
			{/* TODO: Convert to button */}
			<div id="oq-btn-new-conv" onClick={newConversation} />
		</div>
	);
};

export default TitleBar;
