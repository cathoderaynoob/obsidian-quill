interface TitleBarProps {
	newChat: () => void;
}

const TitleBar: React.FC<TitleBarProps> = ({ newChat }) => {
	return (
		<div id="oq-view-title">
			<div id="oq-btn-new-chat" onClick={newChat} />
		</div>
	);
};

export default TitleBar;
