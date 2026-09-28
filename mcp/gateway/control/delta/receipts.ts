export function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function resultCandidates(value: unknown): Record<string, unknown>[] {
  const root = record(value);
  if (!root) return [];
  return [root, record(root.structuredContent)].filter(
    (entry): entry is Record<string, unknown> => entry !== null
  );
}

export function cubeStateNeutral(value: unknown): boolean {
  return resultCandidates(value).some(
    (candidate) =>
      candidate.execution === "planned" ||
      candidate.execution === "unchanged"
  );
}

export function locatorReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some((candidate) => {
    const state = record(candidate.state);
    if (
      candidate.execution !== "applied" ||
      !state ||
      typeof state.uuid !== "string" ||
      typeof state.name !== "string" ||
      typeof state.type !== "string" ||
      !Array.isArray(candidate.changed_fields)
    ) {
      return false;
    }
    if (!Array.isArray(state.position) || state.position.length !== 3) return false;
    if (state.type === "locator") {
      return (
        Array.isArray(state.rotation) &&
        state.rotation.length === 3 &&
        typeof state.ignore_inherited_scale === "boolean"
      );
    }
    return state.type === "null_object";
  });
}

export function boneRiggingDeletionReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some((candidate) => {
    if (candidate.action !== "delete") return false;
    const removedRoot = record(candidate.removed_root);
    const removedCounts = record(candidate.removed_counts);
    if (
      !removedRoot ||
      !removedCounts ||
      typeof removedRoot.uuid !== "string" ||
      removedRoot.uuid.length === 0 ||
      typeof removedRoot.name !== "string" ||
      removedRoot.name.length === 0 ||
      typeof removedRoot.parent !== "string" ||
      typeof removedCounts.groups !== "number" ||
      typeof removedCounts.elements !== "number" ||
      typeof removedCounts.total_nodes !== "number" ||
      typeof candidate.affected_animations !== "number"
    ) {
      return false;
    }
    return (
      removedCounts.groups >= 1 &&
      removedCounts.elements >= 0 &&
      removedCounts.total_nodes ===
        removedCounts.groups + removedCounts.elements &&
      candidate.affected_animations >= 0
    );
  });
}

export function boneRiggingStateReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some((candidate) => {
    if (
      ![
        "create",
        "parent",
        "unparent",
        "rename",
        "set_pivot",
        "set_ik",
        "mirror",
      ].includes(String(candidate.action))
    ) {
      return false;
    }

    const bone = record(candidate.bone);
    if (
      !bone ||
      typeof bone.uuid !== "string" ||
      bone.uuid.length === 0 ||
      typeof bone.name !== "string" ||
      bone.name.length === 0 ||
      typeof bone.parent !== "string" ||
      !Array.isArray(bone.origin) ||
      bone.origin.length !== 3 ||
      !bone.origin.every(
        (value) => typeof value === "number" && Number.isFinite(value)
      ) ||
      !Array.isArray(bone.rotation) ||
      bone.rotation.length !== 3 ||
      !bone.rotation.every(
        (value) => typeof value === "number" && Number.isFinite(value)
      ) ||
      typeof bone.ik_enabled !== "boolean" ||
      !Object.prototype.hasOwnProperty.call(bone, "ik_target")
    ) {
      return false;
    }

    return bone.ik_target === null || typeof bone.ik_target === "string";
  });
}

export function nativeIkControllerReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some((candidate) => {
    if (candidate.action !== "set_ik_controller") return false;
    const controller = record(candidate.controller);
    return Boolean(
      controller &&
      typeof controller.uuid === "string" &&
      typeof controller.name === "string" &&
      Object.prototype.hasOwnProperty.call(controller, "ik_target") &&
      Object.prototype.hasOwnProperty.call(controller, "ik_source") &&
      Object.prototype.hasOwnProperty.call(controller, "ik_pole") &&
      typeof controller.lock_ik_target_rotation === "boolean"
    );
  });
}

export function groupReceiptComplete(capability: string, value: unknown): boolean {
  return resultCandidates(value).some((candidate) => {
    if (candidate.execution !== "applied") return false;
    if (capability === "add_group") {
      return Array.isArray(candidate.groups) && candidate.groups.length > 0 &&
        candidate.groups.every((entry) => {
          const group = record(entry);
          return Boolean(
            group &&
            typeof group.uuid === "string" &&
            typeof group.name === "string" &&
            Array.isArray(group.origin) &&
            Array.isArray(group.rotation) &&
            typeof group.visibility === "boolean" &&
            typeof group.parent === "string"
          );
        });
    }
    if (capability === "modify_group") {
      const group = record(candidate.group);
      return Boolean(
        group &&
        typeof group.uuid === "string" &&
        Array.isArray(group.origin) &&
        Array.isArray(group.rotation) &&
        typeof group.visibility === "boolean" &&
        typeof group.parent === "string"
      );
    }
    if (capability === "reparent_element") {
      return (
        typeof candidate.id === "string" &&
        typeof candidate.parent === "string" &&
        candidate.transform_policy === "preserve_local"
      );
    }
    return false;
  });
}

export function particleTextureHandoffRequired(value: unknown): boolean {
  return resultCandidates(value).some((candidate) => {
    const dependency = record(candidate.texture_dependency);
    return dependency?.status === "REQUIRES_TEXTURING";
  });
}

const STATE_NEUTRAL_ANIMATION_ACTIONS = new Set([
  "select",
  "play",
  "pause",
  "stop",
  "set_time",
  "select_range",
  "expand_bones",
  "collapse_bones",
  "copy",
]);

export function animationTimelineStateNeutral(value: unknown): boolean {
  return resultCandidates(value).some((candidate) => {
    const action = typeof candidate.action === "string" ? candidate.action : null;
    const scope = typeof candidate.scope === "string" ? candidate.scope : null;
    return (
      candidate.changed === false ||
      scope === "timeline_view_only" ||
      scope === "animation_clipboard_only" ||
      (action !== null && STATE_NEUTRAL_ANIMATION_ACTIONS.has(action))
    );
  });
}

export function materialPersistenceOnly(value: unknown): boolean {
  return resultCandidates(value).some(
    (candidate) =>
      candidate.operation === "save" &&
      candidate.scope === "material_persistence_only"
  );
}

export function animationControllerReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some((candidate) => {
    const controller = record(candidate.controller);
    const created = record(candidate.created);
    const removed = record(candidate.removed);
    if (
      candidate.execution !== "applied" ||
      typeof candidate.operation_count !== "number" ||
      candidate.operation_count < 1 ||
      !controller ||
      typeof controller.uuid !== "string" ||
      controller.uuid.length === 0 ||
      typeof controller.name !== "string" ||
      controller.name.length === 0 ||
      typeof controller.state_count !== "number" ||
      controller.state_count < 0 ||
      !Object.prototype.hasOwnProperty.call(controller, "initial_state") ||
      !Array.isArray(candidate.affected_states) ||
      !created ||
      !removed
    ) {
      return false;
    }

    const initialState = record(controller.initial_state);
    if (
      controller.initial_state !== null &&
      !(
        initialState &&
        typeof initialState.uuid === "string" &&
        initialState.uuid.length > 0 &&
        typeof initialState.name === "string" &&
        initialState.name.length > 0
      )
    ) {
      return false;
    }

    const createdStates = created.states;
    const createdTransitions = created.transitions;
    const createdLinks = created.animation_links;
    const createdSounds = created.sounds;
    const createdParticles = created.particles;
    const removedStates = removed.states;
    const removedTransitions = removed.transitions;
    const removedLinks = removed.animation_links;
    const removedSounds = removed.sounds;
    const removedParticles = removed.particles;

    if (
      !Array.isArray(createdStates) ||
      !Array.isArray(createdTransitions) ||
      !Array.isArray(createdLinks) ||
      !Array.isArray(createdSounds) ||
      !Array.isArray(createdParticles) ||
      !Array.isArray(removedStates) ||
      !Array.isArray(removedTransitions) ||
      !Array.isArray(removedLinks) ||
      !Array.isArray(removedSounds) ||
      !Array.isArray(removedParticles)
    ) {
      return false;
    }

    const hasId = (entry: unknown): boolean => {
      const item = record(entry);
      return Boolean(
        item &&
        typeof item.uuid === "string" &&
        item.uuid.length > 0
      );
    };
    const hasIdAndName = (entry: unknown): boolean => {
      const item = record(entry);
      return Boolean(
        hasId(entry) &&
        item &&
        typeof item.name === "string" &&
        item.name.length > 0
      );
    };
    const allRemovedIds = (entries: unknown[]): boolean =>
      entries.every((entry) => typeof entry === "string" && entry.length > 0);

    if (
      !createdStates.every(hasIdAndName) ||
      !createdTransitions.every((entry) => {
        const item = record(entry);
        return Boolean(
          hasId(entry) &&
          item &&
          typeof item.state_uuid === "string" &&
          item.state_uuid.length > 0 &&
          typeof item.target_uuid === "string" &&
          item.target_uuid.length > 0
        );
      }) ||
      !createdLinks.every((entry) => {
        const item = record(entry);
        return Boolean(
          hasId(entry) &&
          item &&
          typeof item.state_uuid === "string" &&
          item.state_uuid.length > 0 &&
          typeof item.animation_key === "string" &&
          item.animation_key.length > 0 &&
          (item.animation_uuid === null ||
            typeof item.animation_uuid === "string")
        );
      }) ||
      !createdSounds.every((entry) => {
        const item = record(entry);
        return Boolean(
          hasId(entry) &&
          item &&
          typeof item.state_uuid === "string" &&
          item.state_uuid.length > 0 &&
          typeof item.effect === "string"
        );
      }) ||
      !createdParticles.every((entry) => {
        const item = record(entry);
        return Boolean(
          hasId(entry) &&
          item &&
          typeof item.state_uuid === "string" &&
          item.state_uuid.length > 0 &&
          typeof item.effect === "string"
        );
      }) ||
      !removedStates.every(hasIdAndName) ||
      !allRemovedIds(removedTransitions) ||
      !allRemovedIds(removedLinks) ||
      !allRemovedIds(removedSounds) ||
      !allRemovedIds(removedParticles)
    ) {
      return false;
    }

    return candidate.affected_states.every((entry) => {
      const state = record(entry);
      return Boolean(
        state &&
        typeof state.uuid === "string" &&
        state.uuid.length > 0 &&
        typeof state.name === "string" &&
        state.name.length > 0 &&
        Array.isArray(state.animations) &&
        Array.isArray(state.transitions) &&
        Array.isArray(state.sounds) &&
        Array.isArray(state.particles)
      );
    });
  });
}

export function textureGroupReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some((candidate) => {
    const group = record(candidate.texture_group);
    if (
      candidate.operation !== "create_group" ||
      !group ||
      typeof group.uuid !== "string" ||
      typeof group.name !== "string" ||
      typeof group.is_material !== "boolean" ||
      !Array.isArray(candidate.textures)
    ) {
      return false;
    }
    return candidate.textures.every((entry) => {
      const texture = record(entry);
      return Boolean(
        texture &&
        typeof texture.uuid === "string" &&
        typeof texture.name === "string" &&
        texture.group === group.uuid
      );
    });
  });
}

export function materialMutationReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some((candidate) => {
    if (!["create", "configure", "assign_channel", "import_texture_set"].includes(String(candidate.operation))) {
      return false;
    }
    const material = record(candidate.material);
    const channels = record(material?.channels);
    const config = record(material?.config);
    if (
      !material ||
      typeof material.uuid !== "string" ||
      material.uuid.length === 0 ||
      typeof material.name !== "string" ||
      material.name.length === 0 ||
      typeof material.is_material !== "boolean" ||
      !channels ||
      !config
    ) {
      return false;
    }

    const validChannel = (value: unknown): boolean => {
      if (value === null) return true;
      const channel = record(value);
      return Boolean(
        channel &&
        typeof channel.uuid === "string" &&
        channel.uuid.length > 0 &&
        typeof channel.name === "string"
      );
    };

    if (
      !["color", "normal", "height", "mer"].every(
        (key) =>
          Object.prototype.hasOwnProperty.call(channels, key) &&
          validChannel(channels[key])
      )
    ) {
      return false;
    }

    return (
      Array.isArray(config.color_value) &&
      config.color_value.length === 4 &&
      config.color_value.every(
        (entry) => typeof entry === "number" && Number.isFinite(entry)
      ) &&
      Array.isArray(config.mer_value) &&
      config.mer_value.length === 3 &&
      config.mer_value.every(
        (entry) => typeof entry === "number" && Number.isFinite(entry)
      ) &&
      typeof config.subsurface_value === "number" &&
      Number.isFinite(config.subsurface_value) &&
      typeof config.saved === "boolean"
    );
  });
}

export function materialInstanceMutationReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some((candidate) => {
    if (!["set", "bulk_set", "clear"].includes(String(candidate.operation))) {
      return false;
    }
    if (
      typeof candidate.face_count !== "number" ||
      !Array.isArray(candidate.changes) ||
      candidate.changes.length !== candidate.face_count
    ) {
      return false;
    }
    return candidate.changes.every((entry) => {
      const change = record(entry);
      return Boolean(
        change &&
        typeof change.cube_uuid === "string" &&
        typeof change.cube_name === "string" &&
        typeof change.face === "string" &&
        typeof change.material_name === "string"
      );
    });
  });
}

export function particleMutationReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some((candidate) => {
    if (
      candidate.valid !== true ||
      candidate.artifact_ready !== true ||
      typeof candidate.wrote_to_path !== "string" ||
      candidate.wrote_to_path.length === 0 ||
      !Array.isArray(candidate.writes)
    ) {
      return false;
    }

    const summary = record(candidate.summary);
    if (
      !summary ||
      typeof summary.identifier !== "string" ||
      summary.identifier.length === 0 ||
      typeof summary.component_count !== "number" ||
      !Array.isArray(summary.diagnostics)
    ) {
      return false;
    }

    return candidate.writes.some((entry) => {
      const write = record(entry);
      return Boolean(
        write &&
          write.kind === "particle" &&
          write.path === candidate.wrote_to_path &&
          typeof write.byte_length === "number" &&
          write.byte_length > 0 &&
          typeof write.replaced_existing === "boolean"
      );
    });
  });
}

export function removeElementReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some((candidate) => {
    const removedRoot = record(candidate.removed_root);
    const removedCounts = record(candidate.removed_counts);
    if (
      !removedRoot ||
      !removedCounts ||
      typeof removedRoot.uuid !== "string" ||
      removedRoot.uuid.length === 0 ||
      typeof removedRoot.name !== "string" ||
      removedRoot.name.length === 0 ||
      typeof removedRoot.type !== "string" ||
      typeof removedRoot.parent !== "string" ||
      typeof removedCounts.groups !== "number" ||
      typeof removedCounts.elements !== "number" ||
      typeof removedCounts.total_nodes !== "number" ||
      typeof candidate.affected_animations !== "number"
    ) {
      return false;
    }

    return (
      removedCounts.groups >= 0 &&
      removedCounts.elements >= 0 &&
      removedCounts.total_nodes > 0 &&
      removedCounts.total_nodes ===
        removedCounts.groups + removedCounts.elements &&
      candidate.affected_animations >= 0
    );
  });
}

export function renderProfileWriteReceiptComplete(value: unknown): boolean {
  const write = record(value);
  return Boolean(
    write &&
      (write.key === "client_entity" || write.key === "render_controller") &&
      typeof write.path === "string" &&
      write.path.length > 0 &&
      typeof write.byte_length === "number" &&
      write.byte_length > 0 &&
      typeof write.replaced_existing === "boolean" &&
      (write.transaction === "single_atomic" ||
        write.transaction === "paired_atomic")
  );
}

export function renderProfileMutationReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some((candidate) => {
    if (
      candidate.execution !== "applied" ||
      candidate.action !== "render_profile"
    ) {
      return false;
    }

    if (candidate.operation === "bind") {
      const transaction = record(candidate.write_transaction);
      const binding = record(candidate.binding);
      const summary = record(candidate.summary);
      const writes = [
        candidate.client_entity_write,
        candidate.render_controller_write,
      ].filter((entry) => entry !== null && entry !== undefined);
      return Boolean(
        transaction &&
          (transaction.state === "single_atomic" ||
            transaction.state === "paired_atomic") &&
          typeof transaction.write_count === "number" &&
          transaction.write_count === writes.length &&
          writes.length > 0 &&
          writes.every(renderProfileWriteReceiptComplete) &&
          binding &&
          typeof binding.slot === "string" &&
          typeof binding.minecraft_material_code === "string" &&
          summary &&
          Array.isArray(summary.slots) &&
          Array.isArray(summary.assignments) &&
          Array.isArray(summary.diagnostics)
      );
    }

    if (candidate.operation === "set_slot") {
      const summary = record(candidate.summary);
      return Boolean(
        renderProfileWriteReceiptComplete(candidate.write) &&
          typeof candidate.slot === "string" &&
          typeof candidate.render_profile === "string" &&
          typeof candidate.minecraft_material_code === "string" &&
          summary &&
          Array.isArray(summary.slots) &&
          Array.isArray(summary.diagnostics)
      );
    }

    if (
      candidate.operation === "assign" ||
      candidate.operation === "unassign"
    ) {
      return Boolean(
        renderProfileWriteReceiptComplete(candidate.write) &&
          typeof candidate.render_controller === "string" &&
          typeof candidate.bone_pattern === "string" &&
          (candidate.operation === "unassign" ||
            typeof candidate.slot === "string")
      );
    }

    return false;
  });
}

export function animationEffectsReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some((candidate) => {
    const animation = record(candidate.animation);
    if (
      !animation ||
      typeof animation.uuid !== "string" ||
      animation.uuid.length === 0 ||
      typeof animation.name !== "string" ||
      typeof candidate.operation_count !== "number" ||
      candidate.operation_count < 1 ||
      !Array.isArray(candidate.results) ||
      candidate.results.length !== candidate.operation_count
    ) {
      return false;
    }

    return candidate.results.every((entry) => {
      const result = record(entry);
      if (
        !result ||
        !["particle", "sound", "timeline"].includes(String(result.channel))
      ) {
        return false;
      }

      const removed = record(result.removed);
      if (removed) {
        if (
          typeof removed.keyframe_uuid !== "string" ||
          removed.keyframe_uuid.length === 0 ||
          !(
            removed.data_point_index === null ||
            (typeof removed.data_point_index === "number" &&
              Number.isSafeInteger(removed.data_point_index) &&
              removed.data_point_index >= 0)
          )
        ) {
          return false;
        }
        if (removed.data_point_index !== null && !Array.isArray(removed.remaining)) {
          return false;
        }
        return true;
      }

      if (
        typeof result.keyframe_uuid !== "string" ||
        result.keyframe_uuid.length === 0 ||
        typeof result.time !== "number" ||
        !Number.isFinite(result.time) ||
        !(
          result.data_point_index === null ||
          (typeof result.data_point_index === "number" &&
            Number.isSafeInteger(result.data_point_index) &&
            result.data_point_index >= 0)
        )
      ) {
        return false;
      }

      if (result.channel === "timeline") {
        return typeof result.script === "string";
      }
      if (typeof result.effect !== "string") return false;
      if (!(result.locator === null || typeof result.locator === "string")) {
        return false;
      }
      if (result.channel === "particle") {
        return (
          (result.bind_to_actor === null || typeof result.bind_to_actor === "boolean") &&
          (result.pre_effect_script === null ||
            typeof result.pre_effect_script === "string")
        );
      }
      return true;
    });
  });
}
