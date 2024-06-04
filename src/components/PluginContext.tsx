// import { StrictMode, createContext, useContext } from "react";
import { createContext, useContext } from "react";
import { GptPluginSettings } from "@/settings";
import { IPluginServices } from "@/interfaces";

interface PluginContextProps {
	settings: GptPluginSettings;
	pluginServices: IPluginServices
}

type PluginContextProviderProps = {
	children: React.ReactNode;
	settings: GptPluginSettings;
	pluginServices: IPluginServices;
};

const PluginContext = createContext<PluginContextProps | null>(null);

export default function PluginContextProvider({
	children,
	settings,
	pluginServices
}: PluginContextProviderProps) {

	return (
		<PluginContext.Provider value={{ settings, pluginServices }}>
			{/* <StrictMode>{children}</StrictMode> */}
			{children}
		</PluginContext.Provider>
	);
}

export const usePluginContext = () => {
	const context = useContext(PluginContext);
	if (!context) {
		throw new Error("usePluginContext must be used within a PluginProvider");
	}
	return context;
};
