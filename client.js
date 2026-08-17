module.exports = {
  name: 'dsh-agents-roles',
  inject: ['slots', 'timer'],
  apply(ctx) {
    styles.insert(`
.roles-settings { display:flex; flex-direction:column; gap:16px; padding:8px 4px 24px; color:var(--dsw-alias-label-primary); font-size:13px; }
.roles-settings .roles-field { display:flex; flex-direction:column; gap:5px; }
.roles-settings .roles-label { color:var(--dsw-alias-label-secondary); font-size:11px; text-transform:uppercase; letter-spacing:.06em; }
.roles-settings .roles-hint { color:var(--dsw-alias-label-secondary); font-size:11px; }
.roles-settings input[type=text], .roles-settings input[type=number], .roles-settings select {
  background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-primary);
  border:1px solid var(--dsw-alias-border-l1); border-radius:6px; padding:6px 9px; font-size:13px; min-width:0; box-sizing:border-box;
}
.roles-settings input:focus, .roles-settings select:focus { outline:none; border-color:var(--dsw-alias-brand-primary); }
.roles-settings .roles-card { background:var(--dsw-alias-bg-layer-1); border:1px solid var(--dsw-alias-border-l1); border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:10px; }
.roles-settings .roles-row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.roles-settings .roles-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.roles-settings .roles-btn { background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); border:1px solid var(--dsw-alias-border-l1); border-radius:7px; padding:6px 12px; font-size:12px; cursor:pointer; white-space:nowrap; }
.roles-settings .roles-btn:hover { border-color:var(--dsw-alias-border-l2); }
.roles-settings .roles-btn:disabled { opacity:.5; cursor:default; }
.roles-settings .roles-btn.primary { background:var(--dsw-alias-brand-primary); color:#000; border-color:transparent; }
.roles-settings .roles-btn.danger { color:var(--dsw-alias-state-error-primary); }
.roles-settings .roles-check { display:flex; gap:8px; align-items:center; color:var(--dsw-alias-label-primary); }
.roles-settings .roles-badge { font-size:11px; font-weight:600; padding:3px 10px; border-radius:999px; border:1px solid var(--dsw-alias-border-l2); color:var(--dsw-alias-label-secondary); }
.roles-settings .roles-badge.on { color:var(--dsw-alias-state-success-primary); border-color:var(--dsw-alias-state-success-primary); }
.roles-settings .roles-load-error { color:var(--dsw-alias-state-error-primary); font-size:12px; }
.roles-settings .roles-spacer { flex:1; }

/* switch toggle */
.roles-settings .roles-switch { position:relative; width:40px; height:22px; border-radius:999px; background:var(--dsw-alias-bg-layer-2); border:1px solid var(--dsw-alias-border-l2); cursor:pointer; padding:0; flex:none; transition:background .15s ease, border-color .15s ease; }
.roles-settings .roles-switch:hover { border-color:var(--dsw-alias-border-l2); }
.roles-settings .roles-switch:disabled { opacity:.5; cursor:default; }
.roles-settings .roles-switch.on { background:var(--dsw-alias-state-success-primary); border-color:transparent; }
.roles-settings .roles-switch-thumb { position:absolute; top:2px; left:2px; width:16px; height:16px; border-radius:50%; background:var(--dsw-alias-label-secondary); transition:left .15s ease, background .15s ease; }
.roles-settings .roles-switch.on .roles-switch-thumb { left:20px; background:#fff; }

/* role list cards */
.roles-settings .roles-role { flex-direction:row; align-items:center; gap:10px; width:100%; text-align:left; cursor:pointer; appearance:none; font:inherit; color:inherit; transition:border-color .12s ease; }
.roles-settings .roles-role:hover { border-color:var(--dsw-alias-border-l2); }
.roles-settings .roles-dot { width:8px; height:8px; border-radius:50%; background:var(--dsw-alias-border-l2); flex:none; }
.roles-settings .roles-dot.on { background:var(--dsw-alias-state-success-primary); }
.roles-settings .roles-role-name { font-weight:600; min-width:92px; }
.roles-settings .roles-role-id { color:var(--dsw-alias-label-secondary); font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:11px; min-width:72px; }
.roles-settings .roles-role-summary { flex:1; color:var(--dsw-alias-label-secondary); font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.roles-settings .roles-edit { flex:none; }

/* per-response model badge in the chat */
.roles-model-badge { font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:11px; color:var(--dsw-alias-label-secondary); white-space:nowrap; }

/* composer fallback model select (roles disabled) */
.roles-composer-select {
  background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-primary);
  border:1px solid var(--dsw-alias-border-l1); border-radius:8px; padding:4px 8px;
  font-size:12px; max-width:230px; min-width:130px; cursor:pointer;
}
.roles-composer-slot { color:var(--dsw-alias-label-secondary); font-size:12px; padding:0 4px; }

/* composer roles ladder pill (matches the standard model selector UI) */
.roles-pill-root { position:relative; min-width:0; display:inline-flex; }
.roles-pill-trigger { min-width:0; max-width:240px; height:28px; color:var(--dsw-alias-label-secondary); cursor:pointer; background:0 0; border:none; border-radius:24px; outline:none; align-items:center; gap:4px; padding:0 4px 0 8px; font-size:13px; font-weight:500; line-height:20px; display:flex; font-family:inherit; }
.roles-pill-trigger:hover:not(:disabled) { background:var(--dsw-alias-interactive-bg-hover); }
.roles-pill-trigger:focus-visible { box-shadow:0 0 0 2px var(--dsw-alias-border-l3); }
.roles-pill-trigger:disabled { color:var(--dsw-alias-label-dimmed); cursor:default; }
.roles-pill-label { text-overflow:ellipsis; white-space:nowrap; min-width:0; overflow:hidden; }
.roles-pill-chevron { color:var(--dsw-alias-label-caption); flex:none; font-size:10px; transition:transform .12s; }
.roles-pill-chevron.roles-pill-open { transform:rotate(180deg); }
.roles-pill-overlay { position:fixed; inset:0; z-index:19; background:transparent; }
.roles-pill-menu { z-index:20; border:1px solid var(--dsw-alias-border-inverted); background:var(--dsw-specific-menu); width:min(240px,100vw - 32px); max-height:min(360px,100vh - 96px); box-shadow:var(--dsw-shadow-lv3); color:var(--dsw-alias-label-primary); border-radius:12px; display:flex; flex-direction:column; padding:4px; position:absolute; bottom:calc(100% + 8px); right:0; overflow:hidden; }
.roles-pill-menu-title { color:var(--dsw-alias-label-tertiary); font-size:11px; text-transform:uppercase; letter-spacing:.05em; padding:6px 8px 4px; }
.roles-pill-scroll { overflow-y:auto; }
.roles-pill-row { display:flex; align-items:center; justify-content:space-between; gap:8px; border-radius:8px; padding:7px 8px; cursor:default; }
.roles-pill-row:hover { background:var(--dsw-alias-interactive-bg-hover); }
.roles-pill-selected { background:var(--dsw-alias-interactive-bg-hover); }
.roles-pill-row-main { display:flex; flex-direction:column; min-width:0; }
.roles-pill-row-name { font-size:13px; line-height:18px; }
.roles-pill-row-desc { color:var(--dsw-alias-label-caption); font-size:12px; line-height:16px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.roles-pill-check { color:var(--dsw-alias-state-success-primary); flex:none; }
.roles-pill-empty { color:var(--dsw-alias-label-tertiary); padding:10px; font-size:13px; }
.roles-pill-note { color:var(--dsw-alias-label-tertiary); font-size:11px; padding:6px 8px 4px; border-top:1px solid var(--dsw-alias-border-l1); margin-top:4px; }

/* modal */
.roles-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:1000; }
.roles-modal { width:min(560px, calc(100vw - 48px)); max-height:calc(100vh - 64px); overflow:auto; background:var(--dsw-alias-bg-layer-2); border:1px solid var(--dsw-alias-border-l2); border-radius:12px; box-shadow:0 18px 50px rgba(0,0,0,.35); display:flex; flex-direction:column; }
.roles-modal-head { display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-bottom:1px solid var(--dsw-alias-border-l1); }
.roles-modal-title { font-weight:700; font-size:14px; }
.roles-modal-body { display:flex; flex-direction:column; gap:12px; padding:16px; }
.roles-modal-body input[type=text], .roles-modal-body input[type=number], .roles-modal-body select { width:100%; }
.roles-modal-foot { display:flex; align-items:center; gap:8px; padding:12px 16px; border-top:1px solid var(--dsw-alias-border-l1); }

/* result dialog */
.roles-settings .roles-result-badge { display:inline-block; align-self:flex-start; font-size:11px; font-weight:700; padding:4px 10px; border-radius:999px; border:1px solid var(--dsw-alias-border-l2); color:var(--dsw-alias-label-secondary); }
.roles-settings .roles-result-badge.ok { color:var(--dsw-alias-state-success-primary); border-color:var(--dsw-alias-state-success-primary); }
.roles-settings .roles-result-badge.warn { color:var(--dsw-alias-state-warn-primary); border-color:var(--dsw-alias-state-warn-primary); }
.roles-settings .roles-result-badge.err { color:var(--dsw-alias-state-error-primary); border-color:var(--dsw-alias-state-error-primary); }
.roles-settings .roles-result-message { display:flex; flex-direction:column; gap:4px; }
.roles-settings .roles-result-line { font-size:13px; line-height:1.5; }
.roles-settings .roles-result-warnings { display:flex; flex-direction:column; gap:8px; border:1px solid var(--dsw-alias-border-l1); border-radius:8px; padding:10px; background:var(--dsw-alias-bg-layer-1); }
.roles-settings .roles-result-warn { color:var(--dsw-alias-state-warn-primary); font-size:12px; line-height:1.45; display:flex; gap:6px; }
`);

    const el = React.createElement;

    function Field(props) {
      return el('div', { className: 'roles-field', style: props.style },
        el('span', { className: 'roles-label' }, props.label),
        props.children,
      );
    }

    // ------------------------------------------------------------------
    // Composer selector: mirrors the standard model-selector UI but is
    // READ-ONLY. With roles enabled it shows the current role as a pill;
    // clicking opens the roles ladder as a display-only list (current role
    // highlighted) â€” the user cannot select models or roles here. With roles
    // disabled it falls back to a plain model select.
    // ------------------------------------------------------------------
    function RolesModelSelect(props) {
      const sessionId = props.sessionId;
      const locked = !!(props && props.locked);
      const [cfg, setCfg] = React.useState(null);       // {enabled, tiers}
      const [role, setRole] = React.useState(null);     // {role, baseTier}
      const [models, setModels] = React.useState(null); // {current, list} (disabled fallback)
      const [open, setOpen] = React.useState(false);

      const refresh = React.useCallback(() => {
        if (!sessionId) return;
        host.call('roles.getSessionRole', { sessionId }).then((r) => { if (r) setRole(r); }).catch(() => {});
        host.call('roles.getState').then((s) => {
          if (!s) return;
          setCfg({ enabled: !!s.enabled, tiers: s.tiers || [] });
          if (!s.enabled) {
            const conn = ctx.get('connection');
            if (conn && conn.api && conn.api.sessions && typeof conn.api.sessions.models === 'function') {
              conn.api.sessions.models({ sessionId }).then((m) => {
                const list = [];
                const groups = (m && m.groups) || [];
                for (const g of groups) {
                  const gname = g.displayName || g.id;
                  for (const mm of (g.models || [])) {
                    list.push({ provider: g.id, model: mm.id, label: gname + '/' + (mm.name || mm.id) });
                  }
                }
                setModels({ current: (m && m.current) || null, list });
              }).catch(() => {});
            }
          }
        }).catch(() => {});
      }, [sessionId]);

      React.useEffect(() => {
        refresh();
        let dispose = null;
        try { dispose = ctx.timer.interval(refresh, 2500); } catch (e) { dispose = null; }
        return () => { if (dispose) { try { dispose(); } catch (e) {} } };
      }, [refresh]);

      if (!cfg) return el('span', { className: 'roles-composer-slot' }, 'â€¦');

      if (!cfg.enabled) {
        if (!models) return el('span', { className: 'roles-composer-slot' }, 'â€¦');
        const cur = models.current;
        const curKey = cur && cur.provider && cur.model ? cur.provider + '|' + cur.model : '';
        const opts = (models.list || []).map((m) => el('option', { key: m.provider + '|' + m.model, value: m.provider + '|' + m.model }, m.label));
        if (curKey && !(models.list || []).some((m) => m.provider + '|' + m.model === curKey)) {
          opts.unshift(el('option', { key: curKey, value: curKey }, cur.provider + '/' + cur.model));
        }
        if (!opts.length) opts.push(el('option', { key: '', value: '' }, 'â€” no models â€”'));
        return el('select', {
          className: 'roles-composer-select',
          disabled: locked,
          value: curKey,
          title: 'Select model',
          onChange: (e) => {
            const [provider, model] = String(e.target.value).split('|');
            if (provider && model) {
              const conn = ctx.get('connection');
              if (conn && conn.api && conn.api.sessions && typeof conn.api.sessions.selectModel === 'function') {
                conn.api.sessions.selectModel({ sessionId, provider, model }).catch(() => {});
              }
            }
          },
        }, opts);
      }

      // Roles enabled: the current roles ladder, shown like the standard
      // model selector but read-only.
      const tiers = cfg.tiers || [];
      const currentRole = (role && role.role) || (tiers.length ? tiers[0].id : '');
      const currentTier = tiers.find((t) => t.id === currentRole) || null;
      const triggerLabel = currentTier
        ? (currentTier.provider && currentTier.model
            ? currentTier.id + ' Â· ' + currentTier.provider + '/' + currentTier.model + (currentTier.reasoningEffort ? ' Â· ' + currentTier.reasoningEffort : '')
            : currentTier.id + ' (unconfigured)')
        : (currentRole || 'role');

      return el('span', { className: 'roles-pill-root' },
        el('button', {
          type: 'button',
          className: 'roles-pill-trigger',
          'aria-label': 'Roles ladder (read-only), current ' + triggerLabel,
          title: triggerLabel + ' â€” roles ladder (read-only)',
          disabled: locked,
          onClick: () => setOpen((o) => !o),
        },
          el('span', { className: 'roles-pill-label' }, triggerLabel),
          el('span', { className: 'roles-pill-chevron' + (open ? ' roles-pill-open' : '') }, 'â–¾'),
        ),
        open ? el('div', { className: 'roles-pill-overlay', onClick: () => setOpen(false) }) : null,
        open ? el('div', { className: 'roles-pill-menu' },
          el('div', { className: 'roles-pill-menu-title' }, 'Roles ladder'),
          el('div', { className: 'roles-pill-scroll' },
            tiers.length
              ? tiers.map((t) => el('div', {
                  key: t.id,
                  className: 'roles-pill-row' + (t.id === currentRole ? ' roles-pill-selected' : ''),
                },
                  el('div', { className: 'roles-pill-row-main' },
                    el('span', { className: 'roles-pill-row-name' }, (t.label || t.id) + ' (' + t.id + ')'),
                    el('span', { className: 'roles-pill-row-desc' }, t.provider && t.model ? t.provider + '/' + t.model + (t.reasoningEffort ? ' Â· ' + t.reasoningEffort : '') : 'not configured'),
                  ),
                  t.id === currentRole ? el('span', { className: 'roles-pill-check' }, 'âœ“') : null,
                ))
              : el('div', { className: 'roles-pill-empty' }, 'no roles configured'),
          ),
          el('div', { className: 'roles-pill-note' }, 'Auto-routed by roles â€” read-only'),
        ) : null,
      );
    }

    // ------------------------------------------------------------------
    // Auto vision admission: while images are pending in the composer, switch
    // the session model to the configured vision role (via the same
    // session.selectModel the model pill uses) so the harness's image gate
    // accepts the prompt; restore when the last image is removed.
    // ------------------------------------------------------------------
    function RolesVisionSwitch(props) {
      const [vision, setVision] = React.useState(null);
      const prevRef = React.useRef(null);
      const switchedRef = React.useRef(false);
      const sessionId = (props && props.session && props.session.id) || (props && props.sessionId) || '';
      const imageIds = (props && props.input && props.input.imageIds) || [];
      const hasImages = imageIds.length > 0;

      React.useEffect(() => {
        let cancelled = false;
        if (!sessionId) return;
        host.call('roles.visionModel', { sessionId }).then((res) => { if (!cancelled) setVision(res); })
          .catch(() => {});
        return () => { cancelled = true; };
      }, [sessionId]);

      React.useEffect(() => {
        if (!sessionId || !vision || !vision.enabled || !vision.provider || !vision.model) return;
        const conn = ctx.get('connection');
        if (!conn || !conn.api || !conn.api.sessions) return;
        const select = conn.api.sessions.selectModel;
        const models = conn.api.sessions.models;
        if (typeof select !== 'function' || typeof models !== 'function') return;
        if (hasImages && !switchedRef.current) {
          models({ sessionId }).then((res) => {
            if (res && res.current && res.current.provider && res.current.model) {
              prevRef.current = {
                provider: res.current.provider,
                model: res.current.model,
                reasoningEffort: res.current.reasoningEffort,
              };
            }
            return select({ sessionId, provider: vision.provider, model: vision.model });
          }).then(() => { switchedRef.current = true; }).catch(() => {});
        } else if (!hasImages && switchedRef.current) {
          switchedRef.current = false;
          const prev = prevRef.current;
          prevRef.current = null;
          if (prev && prev.provider && prev.model) {
            select(Object.assign({ sessionId, provider: prev.provider, model: prev.model }, prev.reasoningEffort ? { reasoningEffort: prev.reasoningEffort } : {})).catch(() => {});
          }
        }
      }, [sessionId, vision, hasImages]);

      return null;
    }

    // ------------------------------------------------------------------
    // Per-response model badge (rendered in every assistant message row)
    // ------------------------------------------------------------------
    function RolesModelBadge(props) {
      const [info, setInfo] = React.useState(null);
      const sessionId = props.sessionId;
      const messageId = props.messageId;

      React.useEffect(() => {
        let cancelled = false;
        if (!sessionId || !messageId) return;
        host.call('roles.getStepModel', { sessionId, messageId }).then((res) => {
          if (cancelled || !res || !res.model) return;
          setInfo(res);
        }).catch(() => { /* silent: no badge */ });
        return () => { cancelled = true; };
      }, [sessionId, messageId]);

      if (!info || !info.model) return null;
      return el('span', {
        className: 'roles-model-badge',
        title: (info.role ? 'role: ' + info.role + ' â€” ' : '') + 'model that produced this response',
      }, info.provider + '/' + info.model);
    }

    // ------------------------------------------------------------------
    // Dedicated result popup: organized message + warnings sections
    // ------------------------------------------------------------------
    function ResultDialog(props) {
      const { result, onClose } = props;
      const ok = !!result.ok;
      const warnings = result.warnings || [];
      const lines = String(result.message || '').split('\n').filter((l) => l.trim() !== '');
      const badgeClass = !ok ? 'err' : (warnings.length ? 'warn' : 'ok');
      const badgeText = !ok ? 'Failed' : (warnings.length ? 'Saved with warnings' : 'Success');
      return el('div', { className: 'roles-overlay', onClick: (e) => { if (e.target === e.currentTarget) onClose(); } },
        el('div', { className: 'roles-modal' },
          el('div', { className: 'roles-modal-head' },
            el('span', { className: 'roles-modal-title' }, result.title || 'Result'),
            el('button', { className: 'roles-btn', onClick: onClose }, 'âœ•'),
          ),
          el('div', { className: 'roles-modal-body' },
            el('div', { className: 'roles-result-badge ' + badgeClass }, badgeText),
            lines.length
              ? el('div', { className: 'roles-result-message' }, lines.map((l, i) => el('div', { className: 'roles-result-line', key: i }, l)))
              : null,
            warnings.length
              ? el('div', { className: 'roles-result-warnings' },
                  el('span', { className: 'roles-label' }, 'Warnings (' + warnings.length + ')'),
                  el('div', { className: 'roles-result-message' }, warnings.map((w, i) => el('div', { className: 'roles-result-warn', key: i }, el('span', null, 'âš '), el('span', null, w)))),
                )
              : null,
          ),
          el('div', { className: 'roles-modal-foot' },
            el('div', { className: 'roles-spacer' }),
            el('button', { className: 'roles-btn primary', onClick: onClose }, 'OK'),
          ),
        ),
      );
    }

    // ------------------------------------------------------------------
    // Dedicated popup editor for ONE role
    // ------------------------------------------------------------------
    function RoleEditor(props) {
      const { draft, providers, onSave, onDelete, onCancel } = props;
      const [role, setRole] = React.useState(JSON.parse(JSON.stringify(draft || {})));
      const [effortInfo, setEffortInfo] = React.useState(null);
      const [effortLoading, setEffortLoading] = React.useState(false);
      const [models, setModels] = React.useState([]);
      const provider = role.provider || '';
      const model = role.model || '';

      React.useEffect(() => {
        if (!provider) { setModels([]); return; }
        let cancelled = false;
        host.call('roles.listModels', { provider }).then((res) => { if (!cancelled) setModels((res && res.models) || []); })
          .catch(() => { if (!cancelled) setModels([]); });
        return () => { cancelled = true; };
      }, [provider]);

      React.useEffect(() => {
        if (!provider || !model) { setEffortInfo(null); return; }
        let cancelled = false;
        setEffortLoading(true);
        host.call('roles.getModelInfo', { provider, model }).then((res) => {
          if (cancelled) return;
          setEffortInfo(res && res.reasoning ? res.reasoning : null);
          setEffortLoading(false);
        }).catch(() => { if (!cancelled) { setEffortInfo(null); setEffortLoading(false); } });
        return () => { cancelled = true; };
      }, [provider, model]);

      const set = (key, value) => setRole((r) => { const n = Object.assign({}, r); n[key] = value; return n; });

      const efforts = (effortInfo && effortInfo.efforts) || [];
      let effortControl;
      if (effortLoading) {
        effortControl = el('span', { className: 'roles-hint' }, 'probing modelâ€¦');
      } else if (efforts.length) {
        const opts = [el('option', { key: '__inherit', value: '' }, 'â€” default â€”')];
        for (const e of efforts) opts.push(el('option', { key: e.id, value: e.id }, (e.name || e.id) + ' (' + e.id + ')'));
        if (role.reasoningEffort && !efforts.some((e) => e.id === role.reasoningEffort)) {
          opts.push(el('option', { key: role.reasoningEffort, value: role.reasoningEffort }, role.reasoningEffort + ' (saved, not offered by this model)'));
        }
        effortControl = el('select', { value: role.reasoningEffort || '', onChange: (e) => set('reasoningEffort', e.target.value) }, opts);
      } else {
        effortControl = el('span', { className: 'roles-hint' }, 'not available for this model');
      }

      return el('div', { className: 'roles-overlay', onClick: (e) => { if (e.target === e.currentTarget) onCancel(); } },
        el('div', { className: 'roles-modal' },
          el('div', { className: 'roles-modal-head' },
            el('span', { className: 'roles-modal-title' }, role.id ? 'Edit role â€” ' + role.id : 'New role'),
            el('button', { className: 'roles-btn', onClick: onCancel }, 'âœ•'),
          ),
          el('div', { className: 'roles-modal-body' },
            el('div', { className: 'roles-grid' },
              el(Field, { label: 'Role id' }, el('input', { type: 'text', value: role.id || '', placeholder: 'e.g. default', onChange: (e) => set('id', e.target.value) })),
              el(Field, { label: 'Label' }, el('input', { type: 'text', value: role.label || '', placeholder: 'e.g. Default', onChange: (e) => set('label', e.target.value) })),
            ),
            el(Field, { label: 'Provider' },
              el('input', { type: 'text', list: 'roles-provider-list', value: provider, placeholder: 'e.g. deepseek', onChange: (e) => set('provider', e.target.value) }),
              el('datalist', { id: 'roles-provider-list' }, (providers || []).map((p) => el('option', { key: p, value: p }))),
            ),
            el(Field, { label: 'Model' },
              el('input', { type: 'text', list: 'roles-model-list', value: model, placeholder: 'e.g. deepseek-chat', onChange: (e) => set('model', e.target.value) }),
              el('datalist', { id: 'roles-model-list' }, models.map((m) => el('option', { key: m.id, value: m.id }, m.name || m.id))),
              models.length ? el('span', { className: 'roles-hint' }, models.length + ' models discovered for ' + provider) : null,
            ),
            el(Field, { label: 'Reasoning effort' },
              effortControl,
              effortInfo && effortInfo.defaultEffort ? el('span', { className: 'roles-hint' }, 'model default: ' + effortInfo.defaultEffort) : null,
            ),
          ),
          el('div', { className: 'roles-modal-foot' },
            onDelete ? el('button', { className: 'roles-btn danger', onClick: onDelete }, 'Delete role') : null,
            el('div', { className: 'roles-spacer' }),
            el('button', { className: 'roles-btn', onClick: onCancel }, 'Cancel'),
            el('button', { className: 'roles-btn primary', onClick: () => onSave(role) }, 'Save'),
          ),
        ),
      );
    }

    // ------------------------------------------------------------------
    // Dedicated popup editor for categories (need -> role)
    // ------------------------------------------------------------------
    function CategoriesEditor(props) {
      const { entries, roleIds, onSave, onCancel } = props;
      const [rows, setRows] = React.useState(JSON.parse(JSON.stringify(entries || [])));
      const patchRow = (i, field, value) => setRows((rs) => {
        const n = rs.slice();
        const r = Object.assign({}, n[i]);
        r[field] = value;
        n[i] = r;
        return n;
      });
      const removeRow = (i) => setRows((rs) => rs.filter((_, idx) => idx !== i));
      const addRow = () => setRows((rs) => rs.concat([{ key: 'category' + (rs.length + 1), value: (roleIds && roleIds[0]) || '' }]));
      const roleOptions = (roleIds || []).map((id) => el('option', { key: id, value: id }, id));

      return el('div', { className: 'roles-overlay', onClick: (e) => { if (e.target === e.currentTarget) onCancel(); } },
        el('div', { className: 'roles-modal' },
          el('div', { className: 'roles-modal-head' },
            el('span', { className: 'roles-modal-title' }, 'Categories â€” need â†’ role'),
            el('button', { className: 'roles-btn', onClick: onCancel }, 'âœ•'),
          ),
          el('div', { className: 'roles-modal-body' },
            el('div', { className: 'roles-card' },
              rows.length
                ? rows.map((r, i) => el('div', { className: 'roles-row', key: i },
                    el('input', { type: 'text', value: r.key, placeholder: 'category', onChange: (e) => patchRow(i, 'key', e.target.value), style: { flex: '1 1 160px' } }),
                    el('select', { value: r.value || '', onChange: (e) => patchRow(i, 'value', e.target.value), style: { flex: '1 1 120px' } }, roleOptions),
                    el('button', { className: 'roles-btn danger', onClick: () => removeRow(i) }, 'âœ•'),
                  ))
                : el('span', { className: 'roles-hint' }, 'no categories yet â€” add one below'),
              el('button', { className: 'roles-btn', onClick: addRow }, '+ Add category'),
            ),
            el('span', { className: 'roles-hint' }, 'Chat messages are auto-classified against these categories (word match) to pick the role; unmatched messages use the base role.'),
          ),
          el('div', { className: 'roles-modal-foot' },
            el('div', { className: 'roles-spacer' }),
            el('button', { className: 'roles-btn', onClick: onCancel }, 'Cancel'),
            el('button', { className: 'roles-btn primary', onClick: () => onSave(rows) }, 'Save'),
          ),
        ),
      );
    }

    // ------------------------------------------------------------------
    // One clean row in the roles list
    // ------------------------------------------------------------------
    function RoleCard(props) {
      const { tier, onEdit } = props;
      const ok = !!(tier.provider && tier.model);
      const summary = ok
        ? tier.provider + '/' + tier.model + (tier.reasoningEffort ? ' Â· effort ' + tier.reasoningEffort : '')
        : 'not configured â€” calls pass through';
      return el('button', { className: 'roles-card roles-role', onClick: onEdit, title: 'Click to configure this role' },
        el('span', { className: 'roles-dot' + (ok ? ' on' : '') }),
        el('span', { className: 'roles-role-name' }, tier.label || tier.id),
        el('span', { className: 'roles-role-id' }, tier.id),
        el('span', { className: 'roles-role-summary' }, summary),
        el('span', { className: 'roles-btn roles-edit' }, 'Edit'),
      );
    }

    // ------------------------------------------------------------------
    // Settings page
    // ------------------------------------------------------------------
    function RolesSection(ownerProps) {
      const [config, setConfig] = React.useState(null);
      const [busy, setBusy] = React.useState(false);
      const [loadError, setLoadError] = React.useState('');
      const [editing, setEditing] = React.useState(null); // number | 'new' | null
      const [catEditing, setCatEditing] = React.useState(false);
      const [result, setResult] = React.useState(null);   // { ok, title, message, warnings } | null
      const close = ownerProps && typeof ownerProps.close === 'function' ? ownerProps.close : null;

      const reload = React.useCallback(() => {
        host.call('roles.getState').then((s) => { setConfig(s); setLoadError(''); setEditing(null); setCatEditing(false); setResult(null); })
          .catch((e) => setLoadError('Failed to load roles state: ' + (e && e.message ? e.message : String(e))));
      }, []);

      React.useEffect(() => { reload(); }, [reload]);

      if (!config) {
        return el('div', { className: 'roles-settings' },
          loadError ? el('div', { className: 'roles-load-error' }, loadError) : el('div', { className: 'roles-label' }, 'Loading rolesâ€¦'),
        );
      }

      const patch = (fn) => setConfig((c) => fn(JSON.parse(JSON.stringify(c))));

      const save = (action, popup) => {
        setBusy(true);
        host.call('roles.configure', {
          action: action || 'set',
          roles: config.tiers,
          categories: config.categories,
          defaultTier: config.defaultTier,
        }).then((res) => {
          if (res && res.state) setConfig(res.state);
          if (popup) {
            const titles = { set: 'Settings saved', enable: 'Routing enabled', disable: 'Routing disabled', reset: 'Roles reset' };
            setResult({
              ok: !!(res && res.ok),
              title: titles[action] || 'Saved',
              message: (res && res.message) || 'Saved.',
              warnings: (res && res.warnings) || [],
            });
          }
          // popup=false (the header switch): stay silent on success
          setBusy(false);
        }).catch((e) => {
          setResult({ ok: false, title: 'Save failed', message: e && e.message ? e.message : String(e), warnings: [] });
          setBusy(false);
        });
      };

      const replaceRole = (i, role) => patch((c) => { c.tiers[i] = role; return c; });
      const removeRole = (i) => patch((c) => { c.tiers.splice(i, 1); return c; });

      const roleIds = (config.tiers || []).map((t) => t.id);
      const categoryEntries = Object.entries(config.categories || {}).map(([key, value]) => ({ key, value }));
      const blankRole = () => ({ id: 'role' + ((config.tiers || []).length + 1), label: '', provider: '', model: '', reasoningEffort: '' });

      const editor = editing !== null ? (
        el(RoleEditor, {
          key: editing === 'new' ? 'new' : 'edit-' + editing,
          draft: editing === 'new' ? blankRole() : config.tiers[editing],
          providers: config.providers || [],
          onSave: (role) => {
            if (editing === 'new') patch((c) => { c.tiers.push(role); return c; });
            else replaceRole(editing, role);
            setEditing(null);
          },
          onDelete: editing === 'new' ? null : () => { removeRole(editing); setEditing(null); },
          onCancel: () => setEditing(null),
        })
      ) : null;

      const categoriesEditor = catEditing ? (
        el(CategoriesEditor, {
          entries: categoryEntries,
          roleIds,
          onSave: (rows) => {
            const cats = {};
            for (const r of rows) {
              const k = String(r.key || '').trim();
              if (k) cats[k] = String(r.value || '');
            }
            patch((c) => { c.categories = cats; return c; });
            setCatEditing(false);
          },
          onCancel: () => setCatEditing(false),
        })
      ) : null;

      return el('div', { className: 'roles-settings' },
        el('div', { className: 'roles-row' },
          el('span', { className: 'roles-badge' + (config.enabled ? ' on' : '') }, config.enabled ? 'ENABLED' : 'DISABLED'),
          el('button', {
            role: 'switch',
            'aria-checked': !!config.enabled,
            className: 'roles-switch' + (config.enabled ? ' on' : ''),
            disabled: busy,
            title: config.enabled ? 'Disable role routing' : 'Enable role routing',
            onClick: () => save(config.enabled ? 'disable' : 'enable', false),
          }, el('span', { className: 'roles-switch-thumb' })),
          el('span', { className: 'roles-label' }, 'providers: ' + (config.providers && config.providers.length ? config.providers.join(', ') : '(none visible)')),
          el('span', { className: 'roles-hint' }, 'auto: text routes by category'),
          config.workflowEngine
            ? el('span', { className: 'roles-hint' }, 'workflows: routed by roles')
            : null,
          config.visionRole
            ? el('span', { className: 'roles-hint' }, 'images â†’ ' + config.visionRole)
            : null,
          config.persisted && config.configPath
            ? el('span', { className: 'roles-hint' }, 'saved to ' + config.configPath)
            : null,
        ),
        el(Field, { label: 'Roles' },
          el('div', { className: 'roles-card' },
            (config.tiers || []).map((tier, i) => el(RoleCard, { key: tier.id + '-' + i, tier, onEdit: () => setEditing(i) })),
            el('div', { className: 'roles-row' },
              el('button', { className: 'roles-btn', onClick: () => setEditing('new') }, '+ Add role'),
              el('button', { className: 'roles-btn', onClick: () => setCatEditing(true) }, 'Categories (' + categoryEntries.length + ')'),
              el('span', { className: 'roles-hint' }, 'top role is cheapest; escalation climbs down the list'),
            ),
          ),
        ),
        el(Field, { label: 'Default role' },
          el('select', { value: config.defaultTier || '', onChange: (e) => patch((c) => { c.defaultTier = e.target.value; return c; }) }, roleIds.map((id) => el('option', { key: id, value: id }, id))),
        ),
        el('div', { className: 'roles-row' },
          el('button', { className: 'roles-btn primary', disabled: busy, onClick: () => save('set', true) }, 'Save'),
          el('button', { className: 'roles-btn', disabled: busy, onClick: () => save('enable', true) }, 'Enable'),
          el('button', { className: 'roles-btn', disabled: busy, onClick: () => save('disable', true) }, 'Disable'),
          el('button', { className: 'roles-btn danger', disabled: busy, onClick: () => save('reset', true) }, 'Reset'),
          el('button', { className: 'roles-btn', disabled: busy, onClick: reload }, 'Reload'),
          close ? el('button', { className: 'roles-btn', onClick: close }, 'Done') : null,
        ),
        editor,
        categoriesEditor,
        result ? el(ResultDialog, { result, onClose: () => setResult(null) }) : null,
      );
    }

    ctx.slots.inject('settings.section', () => ctx.slots.register(
      { name: 'settings.section', id: 'agents-roles', order: 25, label: 'Roles' },
      RolesSection,
    ));
    ctx.slots.inject('conversation.chat.assistant-actions', () => ctx.slots.register(
      { name: 'conversation.chat.assistant-actions', id: 'agents-roles-model', order: 5 },
      RolesModelBadge,
    ));
    ctx.slots.inject('conversation.input.dock', () => ctx.slots.register(
      { name: 'conversation.input.dock', id: 'agents-roles-vision', order: 30 },
      RolesVisionSwitch,
    ));
    ctx.slots.inject('conversation.input.model', () => ctx.slots.register(
      { name: 'conversation.input.model' },
      RolesModelSelect,
    ));
  },

};

