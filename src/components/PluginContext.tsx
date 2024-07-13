import { Vault } from "obsidian";
import { StrictMode, createContext, useContext } from "react";
import { QuillPluginSettings } from "@/settings";
import { IPluginServices } from "@/interfaces";
import ApiService from "@/ApiService";

interface PluginContextProps {
	settings: QuillPluginSettings;
	pluginServices: IPluginServices;
	apiService: ApiService;
	vault: Vault;
}

type PluginContextProviderProps = {
	children: React.ReactNode;
	settings: QuillPluginSettings;
	pluginServices: IPluginServices;
	apiService: ApiService;
	vault: Vault;
};

const PluginContext = createContext<PluginContextProps | null>(null);

export default function PluginContextProvider({
	children,
	settings,
	pluginServices,
	apiService,
	vault,
}: PluginContextProviderProps) {
	return (
		<PluginContext.Provider
			value={{ settings, pluginServices, apiService, vault }}
		>
			<StrictMode>{children}</StrictMode>
			{/* {children} */}
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
