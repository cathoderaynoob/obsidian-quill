import { ELEM_IDS } from "@/constants";

interface TitleBarProps {
	newConversation: (event: React.MouseEvent<HTMLElement>) => void;
}

const TitleBar: React.FC<TitleBarProps> = ({ newConversation }) => {
	return (
		<div id="oq-view-title">
			{/* TODO: Convert to button */}
			<div id={ELEM_IDS.newConversation} onClick={newConversation} />
		</div>
	);
};

export default TitleBar;
