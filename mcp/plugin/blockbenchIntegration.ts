import { prompts, tools } from "@/lib/factories";
import { initPromptLoader } from "@/lib/promptLoader";
import {
  resolveMcpRegistrationProfile,
  type McpRegistrationProfile,
} from "@/lib/registrationProfile";
import type { McpAuthoringPhase } from "@/lib/authoringPhase";
import { resources } from "@/server";
import { registerReferenceModelsResource } from "@/server/resources";
import { applyMcpRegistrationProfile } from "@/server/tools";
import {
  setupProjectNavigationSnapshot,
  teardownProjectNavigationSnapshot,
} from "@/plugin/projectNavigationSnapshot";
import { uiSetup, uiTeardown } from "@/ui";
import { setupI18n } from "@/ui/i18n";
import {
  isExtendedMcpFamiliesEnabled,
  setExtendedMcpProfileHandler,
  settingsSetup,
  settingsTeardown,
} from "@/ui/settings";

export type BlockbenchIntegrationOptions = {
  generation: number;
  isGenerationCurrent(generation: number): boolean;
};

export class BlockbenchIntegration {
  private generation: number | null = null;
  private isGenerationCurrent: ((generation: number) => boolean) | null = null;

  setupBase(options: BlockbenchIntegrationOptions): McpRegistrationProfile {
    this.generation = options.generation;
    this.isGenerationCurrent = options.isGenerationCurrent;

    setupI18n();
    settingsSetup();
    setupProjectNavigationSnapshot();

    const profile = resolveMcpRegistrationProfile(
      isExtendedMcpFamiliesEnabled()
    );

    setExtendedMcpProfileHandler((enabled) => {
      const generation = this.generation;
      if (
        generation === null ||
        !this.isGenerationCurrent?.(generation)
      ) {
        return;
      }
      applyMcpRegistrationProfile(resolveMcpRegistrationProfile(enabled));
    });

    // Runtime-conditional integration. The resource joins the canonical MCP
    // resource registry only when the external Reference Models plugin exists.
    registerReferenceModelsResource();
    return profile;
  }

  async loadPrompts(): Promise<boolean> {
    await initPromptLoader();
    const generation = this.generation;
    return Boolean(
      generation !== null && this.isGenerationCurrent?.(generation)
    );
  }

  setupUi(profile: McpRegistrationProfile, phase: McpAuthoringPhase): void {
    uiSetup({
      tools,
      resources,
      prompts,
      profile,
      phase,
    });
  }

  teardown(): void {
    uiTeardown();
    teardownProjectNavigationSnapshot();
    // settingsTeardown owns both Setting instances and its profile callback.
    settingsTeardown();
    this.generation = null;
    this.isGenerationCurrent = null;
  }
}
