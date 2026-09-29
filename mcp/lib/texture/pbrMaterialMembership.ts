export const PBR_MATERIAL_CHANNELS = ["color", "normal", "height", "mer"] as const;
export type PbrMaterialChannel = (typeof PBR_MATERIAL_CHANNELS)[number];

export type PbrMaterialTextureState = {
  uuid: string;
  group: string;
  pbr_channel: string;
};

export type PbrMaterialTextureChange = {
  uuid: string;
  group: string;
  pbr_channel: string;
};

export type PbrMaterialMembershipPlan = {
  changes: PbrMaterialTextureChange[];
  affected_group_uuids: string[];
};

export type PbrMaterialChannelRequest = {
  channel: PbrMaterialChannel;
  /** Texture UUID to assign, or null to clear this channel. */
  texture_uuid: string | null;
};

function requireUniqueTextureStates(
  states: readonly PbrMaterialTextureState[],
  context: string
): void {
  const seen = new Set<string>();
  for (const state of states) {
    if (!state.uuid) {
      throw new Error(`${context} contains a texture with an empty UUID.`);
    }
    if (seen.has(state.uuid)) {
      throw new Error(`${context} contains duplicate texture UUID ${state.uuid}.`);
    }
    seen.add(state.uuid);
  }
}

function channelsConflict(
  requested: PbrMaterialChannel,
  existing: string
): boolean {
  if (requested === existing) return true;
  return (
    (requested === "normal" && existing === "height") ||
    (requested === "height" && existing === "normal")
  );
}

/**
 * Plans a coherent material membership update without mutating Texture state.
 * One material owns at most one texture per channel; normal/height are mutually
 * exclusive because Bedrock texture_set accepts only one depth source.
 */
export function planPbrMaterialConfiguration(
  states: readonly PbrMaterialTextureState[],
  targetGroupUuid: string,
  requests: readonly PbrMaterialChannelRequest[],
  context: string
): PbrMaterialMembershipPlan {
  if (!targetGroupUuid) {
    throw new Error(`${context} requires a non-empty target material UUID.`);
  }
  requireUniqueTextureStates(states, context);

  const requestByChannel = new Map<PbrMaterialChannel, PbrMaterialChannelRequest>();
  const assignedChannelByTexture = new Map<string, PbrMaterialChannel>();
  for (const request of requests) {
    if (requestByChannel.has(request.channel)) {
      throw new Error(`${context} requests ${request.channel} more than once.`);
    }
    requestByChannel.set(request.channel, request);
    if (request.texture_uuid === null) continue;
    if (!states.some((state) => state.uuid === request.texture_uuid)) {
      throw new Error(
        `${context} incoming texture ${request.texture_uuid} is not present in the supplied texture state.`
      );
    }
    const previous = assignedChannelByTexture.get(request.texture_uuid);
    if (previous && previous !== request.channel) {
      throw new Error(
        `${context} cannot assign texture ${request.texture_uuid} to both ${previous} and ${request.channel}.`
      );
    }
    assignedChannelByTexture.set(request.texture_uuid, request.channel);
  }

  const normal = requestByChannel.get("normal");
  const height = requestByChannel.get("height");
  if (normal?.texture_uuid && height?.texture_uuid) {
    throw new Error(`${context} cannot assign both normal and height textures.`);
  }

  const original = states.map((state) => ({ ...state }));
  let virtual = states.map((state) => ({ ...state }));
  const affectedGroups = new Set<string>([targetGroupUuid]);

  for (const channel of PBR_MATERIAL_CHANNELS) {
    const request = requestByChannel.get(channel);
    if (!request) continue;

    if (request.texture_uuid === null) {
      virtual = virtual.map((state) =>
        state.group === targetGroupUuid && state.pbr_channel === channel
          ? { ...state, group: "" }
          : state
      );
      continue;
    }

    const incoming = virtual.find(
      (state) => state.uuid === request.texture_uuid
    )!;
    if (incoming.group && incoming.group !== targetGroupUuid) {
      affectedGroups.add(incoming.group);
    }

    virtual = virtual.map((state) => {
      if (state.uuid === request.texture_uuid) {
        return {
          ...state,
          group: targetGroupUuid,
          pbr_channel: channel,
        };
      }
      if (
        state.group === targetGroupUuid &&
        channelsConflict(channel, state.pbr_channel)
      ) {
        return { ...state, group: "" };
      }
      return state;
    });
  }

  const finalByUuid = new Map(virtual.map((state) => [state.uuid, state]));
  const changes: PbrMaterialTextureChange[] = [];
  for (const before of original) {
    const after = finalByUuid.get(before.uuid)!;
    if (
      after.group !== before.group ||
      after.pbr_channel !== before.pbr_channel
    ) {
      changes.push({
        uuid: after.uuid,
        group: after.group,
        pbr_channel: after.pbr_channel,
      });
    }
  }

  return {
    changes,
    affected_group_uuids: [...affectedGroups].sort(),
  };
}

/**
 * Plans one material-channel assignment without mutating runtime Texture state.
 */
export function planExclusivePbrMaterialAssignment(
  states: readonly PbrMaterialTextureState[],
  targetGroupUuid: string,
  incomingTextureUuid: string,
  channel: PbrMaterialChannel,
  context: string
): PbrMaterialMembershipPlan {
  return planPbrMaterialConfiguration(
    states,
    targetGroupUuid,
    [{ channel, texture_uuid: incomingTextureUuid }],
    context
  );
}

export function requireExclusivePbrMaterialState(
  states: readonly PbrMaterialTextureState[],
  groupUuid: string,
  context: string
): void {
  requireUniqueTextureStates(states, context);
  const grouped = states.filter((state) => state.group === groupUuid);
  const counts = new Map<string, number>();
  for (const state of grouped) {
    counts.set(state.pbr_channel, (counts.get(state.pbr_channel) ?? 0) + 1);
  }

  for (const channel of PBR_MATERIAL_CHANNELS) {
    if ((counts.get(channel) ?? 0) > 1) {
      throw new Error(`${context} has multiple ${channel} textures in one material.`);
    }
  }

  if ((counts.get("normal") ?? 0) > 0 && (counts.get("height") ?? 0) > 0) {
    throw new Error(`${context} cannot contain both normal and height textures.`);
  }
}
