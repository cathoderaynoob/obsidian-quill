import { App } from "obsidian";
import { QuillPluginSettings } from "@/settings";
import { FeatureProperties, FeaturesRegistry } from "@/featuresRegistry";
import { executeFeature, ExecutionOptions } from "@/executeFeature";
import { IPluginServices } from "@/interfaces";
import ApiService from "@/ApiService";

export default class Features {
  app: App;
  apiService: ApiService;
  settings: QuillPluginSettings;
  featuresRegistry: Record<string, FeatureProperties>;
  pluginServices: IPluginServices;

  constructor(app: App, apiService: ApiService, settings: QuillPluginSettings) {
    this.app = app;
    this.apiService = apiService;
    this.settings = settings;
    this.featuresRegistry = FeaturesRegistry(app);
    this.pluginServices = apiService.pluginServices;
  }

  executeFeature = async (options: ExecutionOptions) => {
    const success = await executeFeature(
      this.featuresRegistry,
      options,
      this.settings,
      this.apiService,
      this.pluginServices
    );
    return success;
  };
}
