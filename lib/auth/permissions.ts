// Permission catalogue (06 §5.1). Roles store these keys; code checks them with can()/requirePermission().
// Viewing leads within your data scope is implicit — there is no "leads.view".

export const PERMISSION_GROUPS = [
  {
    group: "Leads",
    items: [
      { key: "leads.create", label: "Create leads", hint: "Add leads by hand from the + New lead form." },
      { key: "leads.edit", label: "Edit leads", hint: "Change details, log calls and notes, set follow-ups on visible leads." },
      { key: "leads.reassign", label: "Reassign leads", hint: "Give a lead to another person they can see." },
      { key: "leads.delete", label: "Delete leads", hint: "Remove a lead permanently." },
      { key: "leads.export", label: "Export leads", hint: "Download the leads list as CSV." },
      { key: "leads.bulk", label: "Bulk actions", hint: "Reassign or set follow-ups for many leads at once." },
      { key: "leads.merge", label: "Merge duplicates", hint: "Combine two leads of the same customer." },
    ],
  },
  {
    group: "Pipeline",
    items: [
      { key: "pipeline.move", label: "Move stages", hint: "Move leads between pipeline columns." },
      { key: "pipeline.reopen", label: "Reopen closed leads", hint: "Send a Won or Lost lead back to an open stage." },
      { key: "pipeline.overrideQualification", label: "Override qualification", hint: "Move a lead past the qualification gate with a reason." },
    ],
  },
  {
    group: "Queues",
    items: [
      { key: "queues.needsLocation", label: "Needs-location queue", hint: "See and work leads that have no site area yet." },
      { key: "queues.outOfArea", label: "Out-of-area queue", hint: "Accept, regret or close leads outside the service area." },
      { key: "queues.duplicates", label: "Possible duplicates queue", hint: "Review possible duplicate leads." },
    ],
  },
  {
    group: "Insights",
    items: [
      { key: "reports.view", label: "Reports & campaigns", hint: "Open reports, campaign performance and their CSV exports." },
      { key: "team.performance", label: "Team performance", hint: "See how each manager and executive is doing." },
    ],
  },
  {
    group: "People",
    items: [
      { key: "users.view", label: "View users", hint: "See the people in your scope and their branches." },
      { key: "users.manage", label: "Manage users", hint: "Create users, change roles and branches, deactivate, set passwords." },
      { key: "roles.manage", label: "Manage roles", hint: "Create and edit roles and their permissions." },
    ],
  },
  {
    group: "Masters",
    items: [
      { key: "pipelines.manage", label: "Pipelines & statuses", hint: "Add, rename, reorder and colour pipeline stages." },
      { key: "branches.manage", label: "Branches", hint: "Add or edit Experience Centres, radius and pincode rules." },
      { key: "masters.manage", label: "Sources & products", hint: "Maintain the source and product lists." },
    ],
  },
  {
    group: "Admin",
    items: [
      { key: "settings.manage", label: "Settings", hint: "Routing, working hours, SLAs, duplicates." },
      { key: "automations.manage", label: "Automations", hint: "Turn reminder rules on/off and run them now." },
      { key: "templates.manage", label: "Message templates", hint: "Edit WhatsApp template texts." },
      { key: "chatbot.manage", label: "Chatbot", hint: "Edit the chatbot flow and see conversations." },
      { key: "integrations.manage", label: "Integrations", hint: "Meta, WhatsApp, Maps and Sheets connections." },
      { key: "imports.run", label: "Imports", hint: "Import Meta lead CSV files." },
      { key: "audit.view", label: "Audit log", hint: "See who changed what." },
      { key: "demo.use", label: "Demo panel", hint: "Run demo scenarios and reset demo data." },
    ],
  },
] as const;

export type Permission = (typeof PERMISSION_GROUPS)[number]["items"][number]["key"];

export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key));

export const isPermission = (k: string): k is Permission => (ALL_PERMISSIONS as string[]).includes(k);

export const PERMISSION_LABEL = Object.fromEntries(PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => [i.key, i.label]))) as Record<Permission, string>;

export const SCOPE_ORDER = { OWN: 0, BRANCH: 1, ALL: 2 } as const;

export const SCOPE_HINT = {
  OWN: "Sees only the leads they own.",
  BRANCH: "Sees every lead and person in their branches.",
  ALL: "Sees everything in every branch.",
} as const;

export const SCOPE_LABEL = { OWN: "Own", BRANCH: "Branch", ALL: "All" } as const;
