import { createContext, useContext } from "react";
import { IPluginServices } from "@/interfaces";
import ApiService from "@/apiService";
import { GptPluginSettings } from "@/settings";

interface PluginContextProps {
	pluginServices: IPluginServices;
	apiService: ApiService;
	settings: GptPluginSettings;
}

export const PluginContext = createContext<PluginContextProps | undefined>(
	undefined
);

export const usePluginContext = () => {
  const context = useContext(PluginContext);
  // TODO: update this
  if (!context) {
      throw new Error("usePluginContext must be used within a PluginProvider");
  }
  return context;
};
