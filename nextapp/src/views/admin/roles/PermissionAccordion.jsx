'use client';

import { useMemo, useState } from 'react';
import { ChevronDownIcon, Input } from '../../../components/ui/index.js';

/**
 * Permission checkboxes grouped by module, one collapsible section per
 * module instead of one long always-open list -- used both by the role
 * editor and the "New Role" modal's initial-permission picker.
 *
 * Every module starts expanded. Pass `key={selectedRoleId}` from the caller
 * when switching between roles -- that remounts this component so each role
 * starts fresh instead of inheriting the last one's open/closed state.
 */
export function PermissionAccordion({ groups, selectedIds, onToggle, onToggleModule, disabled = false }) {
  const [openModules, setOpenModules] = useState(() => new Set(groups.map((g) => g.module)));
  const [search, setSearch] = useState('');

  const term = search.trim().toLowerCase();
  const isSearching = term.length > 0;

  // A module title match shows every permission in it; otherwise only the
  // permissions whose own name matches. "Select all"/the count badge still
  // act on the module's full permission set, not just what search shows --
  // searching narrows what's visible, it doesn't change what a bulk action
  // covers.
  const visibleGroups = useMemo(() => {
    if (!isSearching) return groups.map((g) => ({ ...g, visible: g.permissions }));
    return groups
      .map((g) => ({
        ...g,
        visible: g.module.toLowerCase().includes(term) ? g.permissions : g.permissions.filter((p) => p.name.toLowerCase().includes(term)),
      }))
      .filter((g) => g.visible.length > 0);
  }, [groups, isSearching, term]);

  function toggleOpen(module) {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  }

  return (
    <div>
      <Input
        placeholder="Search permissions or module..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        containerClassName="role-manager__search"
      />
      <div className="role-manager__modules">
        {visibleGroups.map(({ module, permissions: modulePermissions, visible }) => {
          const isOpen = isSearching || openModules.has(module);
          const allSelected = modulePermissions.every((p) => selectedIds.includes(p.id));
          const selectedCount = modulePermissions.filter((p) => selectedIds.includes(p.id)).length;

          return (
            <div key={module} className="role-manager__module">
              <button
                type="button"
                className="role-manager__module-header"
                aria-expanded={isOpen}
                onClick={() => toggleOpen(module)}
              >
                <h4>{module}</h4>
                <span className="role-manager__module-header-right">
                  <span className="role-manager__module-count">
                    {selectedCount}/{modulePermissions.length}
                  </span>
                  {onToggleModule && !disabled && (
                    <span
                      className="role-manager__toggle-all"
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleModule(modulePermissions, allSelected);
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' && e.key !== ' ') return;
                        e.preventDefault();
                        e.stopPropagation();
                        onToggleModule(modulePermissions, allSelected);
                      }}
                    >
                      {allSelected ? 'Clear all' : 'Select all'}
                    </span>
                  )}
                  <ChevronDownIcon className={`role-manager__chevron ${isOpen ? 'role-manager__chevron--open' : ''}`} />
                </span>
              </button>
              {isOpen && (
                <div className="role-manager__module-grid">
                  {visible.map((perm) => (
                    <label key={perm.id} className="role-manager__perm">
                      <input
                        type="checkbox"
                        disabled={disabled}
                        checked={selectedIds.includes(perm.id)}
                        onChange={() => onToggle(perm.id)}
                      />
                      {perm.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {isSearching && visibleGroups.length === 0 && (
          <p className="text-muted">No permissions match &quot;{search}&quot;.</p>
        )}
      </div>
    </div>
  );
}

export default PermissionAccordion;
