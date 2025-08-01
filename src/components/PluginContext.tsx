import { Vault } from "obsidian";
import { StrictMode, createContext, useContext, useState } from "react";
import { QuillPluginSettings } from "@/settings";
import { IPluginServices } from "@/interfaces";
import ApiService from "@/ApiService";
import VaultUtils from "@/VaultUtils";

interface PluginContextProps {
  settings: QuillPluginSettings;
  pluginServices: IPluginServices;
  apiService: ApiService;
  vault: Vault;
  vaultUtils: VaultUtils;
  isResponding: boolean;
  setIsResponding: React.Dispatch<React.SetStateAction<boolean>>;
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
  const vaultUtils = new VaultUtils(pluginServices, settings);
  const [isResponding, setIsResponding] = useState(false);

  return (
    <PluginContext.Provider
      value={{
        settings,
        pluginServices,
        apiService,
        vault,
        vaultUtils,
        isResponding,
        setIsResponding,
      }}
    >
      <StrictMode>{children}</StrictMode>
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
