module.exports = {
  name: 'dsh-agents-roles',
  apply(ctx) {
    // ------------------------------------------------------------------
    // Roles (dsh-agents-roles) - Host half
    // ------------------------------------------------------------------
    const CONFIG_FILE = '.dsh-agents-roles.json';

    const OMP_ROLES = [
      { id: 'default', label: 'Default' },
      { id: 'smol', label: 'Small' },
      { id: 'slow', label: 'Slow' },
      { id: 'vision', label: 'Vision' },
      { id: 'plan', label: 'Plan' },
      { id: 'designer', label: 'Designer' },
      { id: 'commit', label: 'Commit' },
      { id: 'tiny', label: 'Tiny' },
      { id: 'task', label: 'Task' },
      { id: 'advisor', label: 'Advisor' },
    ];
    const seedRoles = () => OMP_ROLES.map((r) => ({
      id: r.id,
      label: r.label,
      provider: '',
      model: '',
      reasoningEffort: '',
    }));
    const DEFAULT_CATEGORIES = {
      simple: 'smol',
      quick: 'tiny',
      research: 'default',
      coding: 'default',
      review: 'slow',
      plan: 'plan',
      architecture: 'plan',
      design: 'designer',
      commit: 'commit',
      subtask: 'task',
      advice: 'advisor',
    };

    const state = {
      enabled: false,
      tiers: seedRoles(),
      categories: Object.assign({}, DEFAULT_CATEGORIES),
      defaultTier: 'default',
      tags: new Map(),
      stepRetries: new Map(),
      pendingSpawns: new Map(),
      persisted: false,
      configPath: null,
    };

    // messageId -> { provider, model } index per session, fed by session/event
    // (new messages) and backfilled from readSession (history).
    const msgIndexCache = new Map(); // sessionId -> Map(messageId -> {provider, model})
    const pruneCache = () => {
      while (msgIndexCache.size > 60) {
        const first = msgIndexCache.keys().next().value;
        if (first === undefined) break;
        msgIndexCache.delete(first);
      }
    };

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------
    const sidOf = (agent) => {
      if (!agent) return undefined;
      return (agent.session && agent.session.id) || agent.id || undefined;
    };
    const tierIndex = (id) => state.tiers.findIndex((x) => x.id === id);
    const tierAt = (i) => (i >= 0 && i < state.tiers.length ? state.tiers[i] : undefined);
    const configured = (t) => !!t && !!t.provider && !!t.model;
    const nextConfiguredIndex = (idx) => {
      for (let i = idx + 1; i < state.tiers.length; i++) if (configured(state.tiers[i])) return i;
      return -1;
    };
    const tagFor = (sid) => {
      if (!sid) return undefined;
      let tag = state.tags.get(sid);
      if (!tag) {
        const base = state.defaultTier || (state.tiers[0] ? state.tiers[0].id : null);
        tag = { tier: base, need: undefined, baseTier: base };
        state.tags.set(sid, tag);
      }
      return tag;
    };
    const workflowActive = () => !!ctx.get('workflowEngine');
    const contentHasImage = (blocks) => {
      if (!Array.isArray(blocks)) return false;
      return blocks.some((b) => {
        if (!b || typeof b !== 'object') return false;
        if (b.type === 'image') return true;
        if (b.type === 'tool-result') return contentHasImage(b.content);
        return false;
      });
    };
    const textOf = (blocks) => {
      let out = '';
      const walk = (list) => {
        if (!Array.isArray(list)) return;
        for (const b of list) {
          if (!b || typeof b !== 'object') continue;
          if (typeof b.text === 'string') out += ' ' + b.text;
          if (Array.isArray(b.content)) walk(b.content);
        }
      };
      walk(blocks);
      return out;
    };
    const classifyRoleFromText = (text) => {
      const low = String(text || '').toLowerCase();
      for (const k of Object.keys(state.categories)) {
        const roleId = state.categories[k];
        const idx = tierIndex(roleId);
        if (idx < 0 || !configured(state.tiers[idx])) continue;
        try {
          const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (new RegExp('\\b' + escaped + '\\b', 'i').test(low)) return roleId;
        } catch (e) { /* skip malformed key */ }
      }
      return null;
    };
    const visionRoleIndex = () => {
      let idx = tierIndex('vision');
      if (idx >= 0 && configured(state.tiers[idx])) return idx;
      for (let i = 0; i < state.tiers.length; i++) {
        const t = state.tiers[i];
        if (configured(t) && String(t.label || t.id).toLowerCase().indexOf('vision') >= 0) return i;
      }
      return -1;
    };
    const visionRoleId = () => {
      const idx = visionRoleIndex();
      return idx >= 0 ? state.tiers[idx].id : null;
    };
    const isErrorChunk = (c) => {
      if (!c || typeof c !== 'object') return false;
      if (c.type === 'error' || c.kind === 'error' || c.status === 'error') return true;
      if (c.error !== undefined && c.error !== null) return true;
      if (c.finish === 'error' || c.finishReason === 'error' || c.reason === 'error') return true;
      return false;
    };
    const isAbortChunk = (c) => {
      if (!c || typeof c !== 'object') return false;
      return c.type === 'aborted' || c.kind === 'aborted' || c.aborted === true;
    };
    const providerNames = () => {
      try {
        const llm = ctx.get('llm');
        if (!llm || !llm.listProviders) return [];
        return llm.listProviders().map((p) => p.id || p.name || String(p));
      } catch (e) {
        return [];
      }
    };
    const knownProvider = (name) => name && providerNames().includes(name);

    // Model capability + catalog lookups, cached per provider/model.
    const modelInfoCache = new Map();
    const resolveModelInfo = (provider, model, signal) => {
      const key = provider + '::' + model;
      let p = modelInfoCache.get(key);
      if (!p) {
        p = (async () => {
          try {
            const llm = ctx.get('llm');
            if (!llm || !llm.resolveModelInfo) return null;
            return await llm.resolveModelInfo(provider, model, signal);
          } catch (e) {
            return null;
          }
        })();
        modelInfoCache.set(key, p);
      }
      return p;
    };
    const reasoningEffortsOf = (info) => {
      try {
        const efforts = info && info.reasoning && info.reasoning.efforts;
        return Array.isArray(efforts) ? efforts : [];
      } catch (e) {
        return [];
      }
    };
    const supportsEffort = (info, effort) => !!effort && reasoningEffortsOf(info).some((e) => e && e.id === effort);
    const modelListCache = new Map();
    const listModels = (provider) => {
      if (!provider) return Promise.resolve([]);
      let p = modelListCache.get(provider);
      if (!p) {
        p = (async () => {
          try {
            const llm = ctx.get('llm');
            if (!llm || !llm.listModels) return [];
            const list = await llm.listModels(provider);
            return (list || []).map((m) => ({ id: m.id || m.name || String(m), name: m.name }));
          } catch (e) {
            return [];
          }
        })();
        modelListCache.set(provider, p);
      }
      return p;
    };

    // ------------------------------------------------------------------
    // Persistence (workspace file, always written on config changes)
    // ------------------------------------------------------------------
    async function saveConfig() {
      try {
        const fs = ctx.get('fs');
        if (!fs || !fs.resolve || !fs.writeText) return false;
        const target = await fs.resolve(CONFIG_FILE);
        const payload = {
          enabled: state.enabled,
          tiers: state.tiers,
          categories: state.categories,
          defaultTier: state.defaultTier,
        };
        await fs.writeText(target, JSON.stringify(payload, null, 2));
        state.persisted = true;
        state.configPath = CONFIG_FILE;
        return true;
      } catch (e) {
        state.persisted = false;
        return false;
      }
    }
    async function loadConfig() {
      try {
        const fs = ctx.get('fs');
        if (!fs || !fs.resolve || !fs.readText) return;
        const target = await fs.resolve(CONFIG_FILE);
        const text = await fs.readText(target);
        const data = JSON.parse(text);
        if (Array.isArray(data.tiers) && data.tiers.length) state.tiers = data.tiers;
        if (data.categories && typeof data.categories === 'object') state.categories = data.categories;
        if (typeof data.defaultTier === 'string') state.defaultTier = data.defaultTier;
        state.enabled = !!data.enabled;
        state.persisted = true;
        state.configPath = CONFIG_FILE;
      } catch (e) {
        /* no file or unreadable: in-memory only */
      }
    }

    // ------------------------------------------------------------------
    // Shared config engine (roles_configure tool + roles.configure RPC)
    // ------------------------------------------------------------------
    async function applyConfig(args) {
      const rawRoles = args.roles !== undefined ? args.roles : args.tiers;
      const hasSet = rawRoles !== undefined || args.categories !== undefined || args.defaultTier !== undefined;
      const action = args.action || (hasSet ? 'set' : 'show');
      const warnings = [];
      const lines = [];
      if (action === 'reset') {
        state.tiers = seedRoles();
        state.categories = Object.assign({}, DEFAULT_CATEGORIES);
        state.defaultTier = 'default';
        state.enabled = false;
        state.tags.clear();
        lines.push('Roles reset to oh-my-pi defaults (disabled).');
      } else if (action === 'set' || action === 'enable') {
        if (rawRoles !== undefined) {
          if (!Array.isArray(rawRoles) || !rawRoles.length) {
            return { ok: false, message: 'roles: the roles list must be a non-empty array.', warnings };
          }
          const seen = new Set();
          for (const t of rawRoles) {
            if (!t || typeof t.id !== 'string' || !t.id) {
              return { ok: false, message: 'roles: every role needs a non-empty id.', warnings };
            }
            if (seen.has(t.id)) return { ok: false, message: 'roles: duplicate role id "' + t.id + '".', warnings };
            seen.add(t.id);
          }
          state.tiers = rawRoles.map((t) => ({
            id: t.id,
            label: t.label,
            provider: typeof t.provider === 'string' ? t.provider : '',
            model: typeof t.model === 'string' ? t.model : '',
            reasoningEffort: typeof t.reasoningEffort === 'string' ? t.reasoningEffort : '',
          }));
        } else if (!state.tiers.length) {
          state.tiers = seedRoles();
          state.categories = Object.assign({}, DEFAULT_CATEGORIES);
          if (!state.defaultTier) state.defaultTier = 'default';
          warnings.push('No roles supplied - seeded the oh-my-pi default roles.');
        }
        if (args.categories !== undefined) {
          const cats = {};
          for (const k of Object.keys(args.categories)) {
            const v = args.categories[k];
            if (tierIndex(v) < 0) warnings.push('category "' + k + '" -> unknown role "' + v + '" (dropped)');
            else cats[k] = v;
          }
          state.categories = cats;
        }
        if (args.defaultTier !== undefined) {
          if (tierIndex(args.defaultTier) < 0) warnings.push('defaultTier "' + args.defaultTier + '" is not a role id (ignored)');
          else state.defaultTier = args.defaultTier;
        }
        if (!state.defaultTier && state.tiers.length) state.defaultTier = state.tiers[0].id;
        for (const t of state.tiers) {
          if (!configured(t)) warnings.push('role ' + t.id + ' has no provider/model assigned - its calls pass through until configured');
          else if (!knownProvider(t.provider)) warnings.push('role ' + t.id + ': provider "' + t.provider + '" is not a registered provider route');
        }
        if (action === 'enable') {
          state.enabled = true;
          lines.push('Roles ENABLED.');
        } else {
          lines.push('Roles config updated.');
        }
      } else if (action === 'disable') {
        state.enabled = false;
        lines.push('Roles DISABLED - all calls pass through unchanged.');
      }
      if (action !== 'show') {
        const p = await saveConfig();
        lines.push(p ? 'Config persisted to ' + CONFIG_FILE + '.' : 'Persist failed (fs unavailable or denied) - config is in-memory only.');
      }
      return { ok: true, message: lines.join('\n'), warnings, action };
    }

    const snapshot = () => ({
      enabled: state.enabled,
      tiers: state.tiers,
      categories: state.categories,
      defaultTier: state.defaultTier,
      providers: providerNames(),
      workflowEngine: workflowActive(),
      visionRole: visionRoleId(),
      persisted: state.persisted,
      configPath: state.configPath,
    });

    // ------------------------------------------------------------------
    // 1) Routing: agent/request waterfall - pick the role model + effort
    // ------------------------------------------------------------------
    ctx.on('agent/request', async (payload, next) => {
      const config = await next();
      if (!state.enabled || !config) return config;
      try {
        const sid = sidOf(payload && payload.agent);
        if (!sid) return config;
        const tag = tagFor(sid);
        if (tag.explicit) return config; // workflow/owner opted out via @no-role
        let idx = tierIndex(tag.tier);
        if (idx < 0) idx = state.tiers.findIndex((t) => configured(t));
        if (idx < 0) return config;
        const tier = state.tiers[idx];
        if (!configured(tier)) return config;
        tag.tier = tier.id;
        const out = Object.assign({}, config, { provider: tier.provider, model: tier.model });
        if (tier.reasoningEffort) {
          try {
            const info = await resolveModelInfo(tier.provider, tier.model, payload && payload.signal);
            if (supportsEffort(info, tier.reasoningEffort)) out.reasoningEffort = tier.reasoningEffort;
          } catch (e) { /* effort stays as the request carried it */ }
        }
        return out;
      } catch (e) {
        return config;
      }
    });

    // ------------------------------------------------------------------
    // 2) Escalation: llm/stream waterfall (async generator -
    //    must return an AsyncIterable synchronously for yield* chaining).
    // ------------------------------------------------------------------
    ctx.on('llm/stream', (options, next) => {
      return (async function* () {
        let stream;
        try {
          stream = await next();
        } catch (e) {
          throw e;
        }
        if (options && options.__ladderEscalated) {
          yield* stream;
          return;
        }
        let sid;
        try {
          const agents = ctx.get('agents');
          const initiator = agents && agents.currentInitiator ? agents.currentInitiator() : undefined;
          sid = sidOf(initiator);
        } catch (e) {
          sid = undefined;
        }
        let errored = false;
        let aborted = false;
        for await (const chunk of stream) {
          if (isErrorChunk(chunk)) errored = true;
          if (isAbortChunk(chunk)) aborted = true;
          yield chunk;
        }
        // Ladder climb: role model failed -> retry on the next configured role.
        if (state.enabled && errored && !aborted && sid) {
          const tag = state.tags.get(sid);
          if (tag && !tag.explicit) {
            const idx = tierIndex(tag.tier);
            const nextIdx = idx >= 0 ? nextConfiguredIndex(idx) : -1;
            if (nextIdx >= 0) {
              const nextTier = state.tiers[nextIdx];
              tag.tier = nextTier.id;
              const llm = ctx.get('llm');
              if (llm && llm.stream) {
                const retryOptions = Object.assign({}, options, {
                  provider: nextTier.provider,
                  model: nextTier.model,
                  __ladderEscalated: true,
                });
                if (nextTier.reasoningEffort) {
                  try {
                    const info = await resolveModelInfo(nextTier.provider, nextTier.model);
                    if (supportsEffort(info, nextTier.reasoningEffort)) retryOptions.reasoningEffort = nextTier.reasoningEffort;
                  } catch (e) { /* keep original effort */ }
                }
                try {
                  const retry = llm.stream(retryOptions);
                  for await (const c of retry) yield c;
                } catch (e) {
                  /* escalated attempt failed too: original error stands */
                }
              }
            }
          }
        }
      })();
    });

    // ------------------------------------------------------------------
    // 3) Escalation for request-time failures (before streaming starts)
    // ------------------------------------------------------------------
    ctx.on('agent/request-error', async (payload, next) => {
      if (!state.enabled) return next();
      try {
        const sid = sidOf(payload && payload.agent);
        if (!sid) return next();
        const tag = tagFor(sid);
        if (tag.explicit) return next();
        const idx = tierIndex(tag.tier);
        const nextIdx = idx >= 0 ? nextConfiguredIndex(idx) : -1;
        if (nextIdx < 0) return next();
        const key = sid + ':' + payload.turn + ':' + payload.step;
        const n = state.stepRetries.get(key) || 0;
        if (n >= 1) return next();
        state.stepRetries.set(key, n + 1);
        if (state.stepRetries.size > 512) {
          const first = state.stepRetries.keys().next().value;
          if (first !== undefined) state.stepRetries.delete(first);
        }
        const nextTier = state.tiers[nextIdx];
        tag.tier = nextTier.id;
        return { kind: 'retry' };
      } catch (e) {
        return next();
      }
    });

    // ------------------------------------------------------------------
    // 4) Tag freshly published subagents when roles_spawn could not
    //    determine the child session id up front.
    // ------------------------------------------------------------------
    ctx.on('subagent/start', (info) => {
      try {
        if (!info || !state.pendingSpawns.size) return;
        const cands = [
          info.runId,
          info.id,
          info.sessionId,
          info.childId,
          info.session && info.session.id,
          info.run && info.run.id,
        ].filter(Boolean);
        for (const c of cands) {
          const p = state.pendingSpawns.get(c);
          if (p) {
            state.tags.set(c, { tier: p.tier, need: p.need, baseTier: p.tier });
            state.pendingSpawns.delete(c);
          }
        }
      } catch (e) {
        /* ignore */
      }
    });

    // ------------------------------------------------------------------
    // 5) Workflow integration: when the workflows plugin is enabled, tag
    //    workflow agents with a role so their model calls use the ladder.
    // ------------------------------------------------------------------
    ctx.on('workflow/agent-start', (info, agent) => {
      try {
        if (!agent || !agent.childId) return;
        const probe = String(agent.label || '') + ' ' + String(agent.phase || '');
        const low = probe.toLowerCase();
        const explicit = low.indexOf('@no-role') >= 0;
        let roleId = null;
        const m = low.match(/@role\s*:\s*([a-z0-9_-]+)/);
        if (m && m[1]) roleId = m[1];
        if (explicit) {
          state.tags.set(agent.childId, { tier: null, need: String(agent.label || ''), explicit: true });
          return;
        }
        if (!roleId) {
          for (const k of Object.keys(state.categories)) {
            if (low.indexOf(k.toLowerCase()) >= 0 && tierIndex(state.categories[k]) >= 0) { roleId = state.categories[k]; break; }
          }
        }
        if (!roleId) roleId = state.defaultTier || (state.tiers[0] ? state.tiers[0].id : null);
        if (roleId && tierIndex(roleId) >= 0) {
          state.tags.set(agent.childId, { tier: roleId, need: String(agent.label || ''), baseTier: roleId });
        }
      } catch (e) {
        /* ignore */
      }
    });

    // ------------------------------------------------------------------
    // 6) Index assistant messages by id (chat model badge) and auto-route
    //    user messages: images -> vision role (when configured), else text
    //    classified through the categories map -> that role. Unmatched
    //    messages revert the session to its base role.
    // ------------------------------------------------------------------
    ctx.on('session/event', (session, event) => {
      try {
        if (!event || !event.data) return;
        const sid = session && session.id;
        if (!sid) return;
        if (event.type === 'assistant/message' && event.data.message) {
          const mid = event.data.message.id;
          if (!mid) return;
          const src = event.data.message.source || {};
          let idx = msgIndexCache.get(sid);
          if (!idx) {
            idx = new Map();
            msgIndexCache.set(sid, idx);
          }
          idx.set(mid, {
            provider: typeof src.provider === 'string' ? src.provider : '',
            model: typeof src.model === 'string' ? src.model : '',
          });
          if (idx.size > 4000) {
            const first = idx.keys().next().value;
            if (first !== undefined) idx.delete(first);
          }
          pruneCache();
        } else if (event.type === 'user/message' && event.data.message) {
          const tag = tagFor(sid);
          if (tag.explicit) return;
          const hasImage = contentHasImage(event.data.message.content);
          let auto = null;
          if (hasImage) {
            const vIdx = visionRoleIndex();
            if (vIdx >= 0) auto = state.tiers[vIdx].id;
          } else {
            auto = classifyRoleFromText(textOf(event.data.message.content));
          }
          if (auto && tierIndex(auto) >= 0) {
            tag.tier = auto;
            tag.autoOverride = auto;
          } else if (!hasImage && tag.autoOverride) {
            tag.tier = tag.baseTier || state.defaultTier || (state.tiers[0] ? state.tiers[0].id : null);
            tag.autoOverride = null;
          }
        }
      } catch (e) {
        /* ignore */
      }
    });

    // ------------------------------------------------------------------
    // RPC for the settings page (harness.handle) + tools
    // ------------------------------------------------------------------
    try {
      harness.handle('roles.getState', () => snapshot());
      harness.handle('roles.configure', async (args) => {
        const res = await applyConfig(args || {});
        return { ok: res.ok, message: res.message, warnings: res.warnings || [], state: snapshot() };
      });
      harness.handle('roles.getModelInfo', async (args) => {
        const provider = args && args.provider ? String(args.provider) : '';
        const model = args && args.model ? String(args.model) : '';
        if (!provider || !model) return { reasoning: null, error: 'provider and model are required' };
        const info = await resolveModelInfo(provider, model);
        if (!info || !info.reasoning) return { reasoning: null, error: info ? null : 'model not resolvable' };
        const efforts = reasoningEffortsOf(info).map((e) => ({ id: e.id, name: e.name }));
        return { reasoning: { defaultEffort: info.reasoning.defaultEffort, efforts }, error: null };
      });
      harness.handle('roles.listModels', async (args) => {
        const provider = args && args.provider ? String(args.provider) : '';
        if (!provider) return { models: [], error: 'provider is required' };
        const models = await listModels(provider);
        return { models, error: null };
      });
      harness.handle('roles.getStepModel', async (args) => {
        const sessionId = args && args.sessionId ? String(args.sessionId) : '';
        const messageId = args && args.messageId ? String(args.messageId) : '';
        if (!state.enabled || !sessionId || !messageId) return null;
        let idx = msgIndexCache.get(sessionId);
        if (!idx) {
          idx = new Map();
          try {
            const sq = ctx.get('sessionQuery');
            if (sq && sq.readSession) {
              const snap = await sq.readSession(sessionId);
              for (const ev of snap.events || []) {
                if (ev && ev.type === 'assistant/message' && ev.data && ev.data.message) {
                  const src = ev.data.message.source || {};
                  idx.set(ev.data.message.id, {
                    provider: typeof src.provider === 'string' ? src.provider : '',
                    model: typeof src.model === 'string' ? src.model : '',
                  });
                }
              }
            }
          } catch (e) {
            /* keep partial index */
          }
          msgIndexCache.set(sessionId, idx);
          pruneCache();
        }
        const rec = idx.get(messageId);
        if (!rec || !rec.model) return null;
        const tag = state.tags.get(sessionId);
        return {
          provider: rec.provider,
          model: rec.model,
          role: tag && tag.tier ? tag.tier : null,
        };
      });
      harness.handle('roles.visionModel', async (args) => {
        const vIdx = visionRoleIndex();
        if (!state.enabled || vIdx < 0) return { enabled: !!state.enabled, provider: null, model: null };
        const tier = state.tiers[vIdx];
        return { enabled: true, provider: tier.provider, model: tier.model };
      });
      harness.handle('roles.getSessionRole', async (args) => {
        const sessionId = args && args.sessionId ? String(args.sessionId) : '';
        const tag = sessionId ? state.tags.get(sessionId) : undefined;
        const base = (tag && tag.baseTier) || state.defaultTier || (state.tiers[0] ? state.tiers[0].id : null);
        const role = tag ? (tag.tier || (tag.explicit ? null : base)) : base;
        return { enabled: !!state.enabled, role, baseTier: base };
      });
      harness.handle('roles.setSessionRole', async (args) => {
        const sessionId = args && args.sessionId ? String(args.sessionId) : '';
        const role = args && args.role ? String(args.role) : '';
        const enabled = !!state.enabled;
        if (!sessionId) return { ok: false, message: 'sessionId is required', role: null, baseTier: null, enabled };
        if (tierIndex(role) < 0) return { ok: false, message: 'unknown role "' + role + '"', role: null, baseTier: null, enabled };
        state.tags.set(sessionId, { tier: role, need: undefined, baseTier: role });
        return { ok: true, role, baseTier: role, enabled };
      });
      console.log('[dsh-agents-roles] rpc handlers registered');
    } catch (e) {
      throw new Error('roles rpc registration failed: ' + (e && e.message ? e.message : String(e)));
    }

    function registerTool(name, description, properties, required, execute) {
      try {
        const definition = harness.defineTool({
          name,
          description,
          parameters: { type: 'object', properties, required },
          output: {
            schema: { type: 'string' },
            render: (args, value) => [{ type: 'text', text: String(value) }],
          },
          execute: async (args) => execute(args || {}),
        });
        harness.registerTool(ctx, definition);
        console.log('[dsh-agents-roles] tool registered: ' + name);
      } catch (e) {
        throw new Error('roles tool "' + name + '" registration failed: ' + (e && e.message ? e.message : String(e)));
      }
    }

    const summary = () => {
      const provs = providerNames();
      const lines = [];
      lines.push('Roles (dsh-agents-roles) - status');
      lines.push('enabled: ' + state.enabled);
      lines.push('providers available: ' + (provs.length ? provs.join(', ') : '(none visible)'));
      lines.push('workflow integration: ' + (workflowActive() ? 'active - workflow agents are routed by role' : 'inactive (workflows plugin not present)'));
      const vRole = visionRoleId();
      lines.push('auto-vision: ' + (vRole ? 'active - image messages route to role "' + vRole + '" and the composer auto-selects its model' : 'inactive (no configured vision role)'));
      const cats = Object.keys(state.categories);
      lines.push('auto-category routing: ' + (cats.length ? 'active - text classified to ' + cats.map((k) => k + '->' + state.categories[k]).join(', ') : 'inactive (no categories)'));
      if (state.persisted && state.configPath) lines.push('config file: ' + state.configPath + ' (persisted)');
      lines.push('roles (' + state.tiers.length + '):');
      for (const t of state.tiers) {
        const model = configured(t)
          ? t.provider + '/' + t.model + (knownProvider(t.provider) ? '' : '  [WARN: provider not registered]')
          : '(not configured - calls pass through)';
        lines.push('  ' + t.id + '  ' + (t.label || '') + '  ' + model + (t.reasoningEffort ? '  effort=' + t.reasoningEffort : ''));
      }
      lines.push('defaultTier: ' + (state.defaultTier || '(first role)'));
      lines.push('hint: roles_configure action=enable|set|disable|reset|show Â· config auto-persisted to ' + CONFIG_FILE);
      lines.push('hint: workflow agents can pick a role via label/phase "@role:<id>" or bypass routing with "@no-role"');
      return lines.join('\n');
    };

    registerTool(
      'roles_status',
      'Show the Roles (dsh-agents-roles) configuration: roles, models, efforts, categories, default role, workflow integration state, auto-vision and auto-category routing, available providers, and config file.',
      {},
      [],
      () => summary()
    );

    registerTool(
      'roles_configure',
      'Configure the Roles ladder: ordered roles (oh-my-pi defaults: default, smol, slow, vision, plan, designer, commit, tiny, task, advisor) with a provider/model per role and an optional reasoningEffort per role (applied only when the model offers that level), plus the category->role map and default role. Action "enable" activates routing, "disable" stops it, "set" updates config, "reset" restores oh-my-pi defaults, "show" prints it. Roles without a provider/model pass calls through untouched. Changes are persisted automatically. When the workflows plugin is enabled, workflow agents are automatically routed by role (label/phase "@role:<id>" forces a role, "@no-role" bypasses). User messages auto-route: images go to the vision role (when configured) and the composer auto-selects its model so the harness accepts the image; text is classified against the categories map (word match) to its role; unmatched messages use the base role. The composer model selector shows the roles ladder (read-only) when routing is enabled.',
      {
        action: { type: 'string', enum: ['show', 'enable', 'disable', 'set', 'reset'], description: 'What to do. Defaults to "set" when roles/categories/defaultTier are supplied, else "show".' },
        roles: {
          type: 'array',
          description: 'Ordered roles, cheapest first. Each: {id, provider, model, label?, reasoningEffort?}. provider/model may be empty (unconfigured). reasoningEffort is applied only when the model supports that level.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              provider: { type: 'string' },
              model: { type: 'string' },
              reasoningEffort: { type: 'string' },
            },
            required: ['id'],
            additionalProperties: false,
          },
        },
        categories: { type: 'object', description: 'Need/category name -> role id, e.g. {coding: "default"}. Any string keys are accepted; text is matched as a word.' },
        defaultTier: { type: 'string', description: 'Role used for agents with no specific category.' },
      },
      [],
      async (args) => {
        const res = await applyConfig(args || {});
        const parts = [];
        if (res.message) parts.push(res.message);
        if (res.warnings && res.warnings.length) parts.push('warnings:\n  ' + res.warnings.join('\n  '));
        parts.push(summary());
        return parts.join('\n\n');
      }
    );

    registerTool(
      'roles_spawn',
      'Spawn a subagent for a need, classified onto a Roles ladder role (via category or default). The child session is tagged so its model calls are routed by the Roles plugin.',
      {
        need: { type: 'string', description: 'The task the spawned agent should perform.' },
        category: { type: 'string', description: 'Roles category name (e.g. coding, research, plan, design, commit, review, advice). Falls back to keyword match on need, then defaultTier.' },
        provider: { type: 'string', description: 'Subagent provider name (see subagents.list). Default: auto-pick.' },
        label: { type: 'string', description: 'Human label for the child agent.' },
      },
      ['need'],
      async (args) => {
        const need = String(args.need || '').trim();
        if (!need) return 'roles_spawn: "need" is required.';
        if (!state.tiers.length) return 'roles_spawn: no roles configured. Run roles_configure first.\n\n' + summary();
        let tierId = null;
        if (args.category && state.categories[args.category] && tierIndex(state.categories[args.category]) >= 0) {
          tierId = state.categories[args.category];
        } else {
          const low = need.toLowerCase();
          for (const k of Object.keys(state.categories)) {
            if (low.indexOf(k.toLowerCase()) >= 0 && tierIndex(state.categories[k]) >= 0) { tierId = state.categories[k]; break; }
          }
        }
        if (!tierId) tierId = state.defaultTier || state.tiers[0].id;
        const tier = tierAt(tierIndex(tierId));
        if (!tier) return 'roles_spawn: role "' + tierId + '" not found.';
        const subagents = ctx.get('subagents');
        if (!subagents || !subagents.start || !subagents.list) {
          return 'roles_spawn: subagents service unavailable.';
        }
        let names = [];
        try { names = subagents.list(); } catch (e) { names = []; }
        if (!names.length) return 'roles_spawn: no subagent providers registered.';
        let providerName = args.provider;
        if (!providerName) {
          providerName = names.find((n) => /default|standard|main/i.test(n)) || names[0];
        }
        if (names.indexOf(providerName) < 0) {
          return 'roles_spawn: provider "' + providerName + '" not registered. Available: ' + names.join(', ');
        }
        let parent;
        try {
          const agents = ctx.get('agents');
          parent = agents && agents.currentInitiator ? agents.currentInitiator() : undefined;
        } catch (e) { parent = undefined; }
        const childPrompt = '[dsh-agents-roles] assigned role: ' + tier.id +
          (configured(tier) ? ' (model ' + tier.provider + '/' + tier.model + (tier.reasoningEffort ? ', effort ' + tier.reasoningEffort : '') + '). Routing is enforced by the Roles plugin.' : ' (not configured yet - calls pass through).') + '\n\n' + need;
        const request = { label: args.label || ('role-' + tier.id), prompt: childPrompt };
        if (parent) request.parent = parent;
        let run;
        try {
          run = await subagents.start(providerName, request);
        } catch (e) {
          return 'roles_spawn: subagent start failed: ' + (e && e.message ? e.message : String(e));
        }
        const childSid =
          (run && (run.sessionId || run.id || run.childId || (run.session && run.session.id) || (run.run && run.run.id))) || undefined;
        if (childSid) {
          state.tags.set(childSid, { tier: tier.id, need: need, baseTier: tier.id });
        } else {
          for (const k of ['runId', 'id', 'sessionId', 'childId']) {
            if (run && run[k]) state.pendingSpawns.set(run[k], { tier: tier.id, need: need, baseTier: tier.id });
          }
        }
        const lines = [];
        lines.push('Spawned roles subagent');
        lines.push('  need: ' + need);
        lines.push('  category: ' + (args.category || '(keyword/default)'));
        lines.push('  role: ' + tier.id + ' -> ' + (configured(tier) ? tier.provider + '/' + tier.model + (tier.reasoningEffort ? ' (effort ' + tier.reasoningEffort + ')' : '') : '(not configured)'));
        lines.push('  provider: ' + providerName);
        lines.push('  run id: ' + (run && (run.id || run.runId || '?')));
        lines.push('  child session id: ' + (childSid || '(unknown - assign with roles_assign once listed)'));
        lines.push('  routing active: ' + state.enabled);
        return lines.join('\n');
      }
    );

    registerTool(
      'roles_assign',
      'Manually assign (or clear) the Roles ladder role for a session/agent id. Use "default" for the default role, "clear" to reset to auto.',
      {
        sessionId: { type: 'string', description: 'Session id of the agent to re-role.' },
        tier: { type: 'string', description: 'Role id, "default", or "clear".' },
      },
      ['sessionId', 'tier'],
      (args) => {
        const sid = String(args.sessionId || '').trim();
        if (!sid) return 'roles_assign: sessionId is required.';
        const tierArg = String(args.tier || '').trim();
        if (tierArg === 'clear') {
          state.tags.delete(sid);
          return 'Cleared role tag for ' + sid + ' (next request re-tags with default).';
        }
        let tierId = tierArg;
        if (tierArg === 'default') tierId = state.defaultTier || (state.tiers[0] && state.tiers[0].id);
        if (!tierId || tierIndex(tierId) < 0) {
          return 'roles_assign: unknown role "' + tierArg + '". Known: ' + state.tiers.map((t) => t.id).join(', ');
        }
        state.tags.set(sid, { tier: tierId, need: undefined, baseTier: tierId });
        const tier = tierAt(tierIndex(tierId));
        return 'Assigned ' + sid + ' -> role ' + tierId + ' (' + (configured(tier) ? tier.provider + '/' + tier.model + (tier.reasoningEffort ? ', effort ' + tier.reasoningEffort : '') : 'not configured') + ').';
      }
    );

    // ------------------------------------------------------------------
    // Startup: load persisted config (best-effort) and announce providers
    // ------------------------------------------------------------------
    (async () => {
      try { await loadConfig(); } catch (e) { /* ignore */ }
      const provs = providerNames();
      console.log('[dsh-agents-roles] active. providers=' + (provs.join(', ') || 'none') + ' enabled=' + state.enabled + ' roles=' + state.tiers.length + ' workflow=' + workflowActive());
    })();
  },

};

