import {
  BarChart3,
  Bot,
  Building2,
  CalendarCheck,
  ClipboardList,
  FileText,
  FlaskConical,
  Handshake,
  HardHat,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Map,
  Megaphone,
  ScrollText,
  Settings,
  SquareKanban,
  Sun,
  Upload,
  Users,
  UsersRound,
  Layers,
  GitBranch,
  Tags,
  Package,
  Store,
  ShieldCheck,
  UserCog,
  Gauge,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/auth/permissions";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  feature?: string; // FeatureBadge source
  perms?: Permission[]; // any one of these; omitted = everyone signed in
  demoOnly?: boolean;
}

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Work",
    items: [
      { href: "/dashboard/my-day", label: "My Day", icon: Sun },
      { href: "/dashboard/leads", label: "Leads", icon: ListChecks },
      { href: "/dashboard/pipeline", label: "Pipeline", icon: SquareKanban },
      { href: "/dashboard/queues", label: "Queues", icon: Layers, perms: ["queues.needsLocation", "queues.outOfArea", "leads.reassign"] },
      { href: "/dashboard/appointments", label: "Appointments", icon: CalendarCheck },
      { href: "/dashboard/inbox", label: "Inbox", icon: Inbox, feature: "F22" },
    ],
  },
  {
    title: "Insights",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/reports", label: "Reports", icon: BarChart3, perms: ["reports.view"] },
      { href: "/dashboard/team-performance", label: "Team performance", icon: Gauge, perms: ["team.performance"] },
      { href: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone, perms: ["reports.view"] },
      { href: "/dashboard/map", label: "Map", icon: Map, feature: "F27" },
    ],
  },
  {
    title: "Customers",
    items: [
      { href: "/dashboard/contacts", label: "Contacts", icon: Users },
      { href: "/dashboard/companies", label: "Companies / Partners", icon: Building2 },
      { href: "/dashboard/deals", label: "Deals", icon: Handshake },
      { href: "/dashboard/projects", label: "Projects", icon: HardHat, feature: "F36" },
      { href: "/dashboard/quotations", label: "Quotations", icon: FileText, feature: "F37" },
    ],
  },
  {
    title: "Masters",
    items: [
      { href: "/dashboard/masters/pipelines", label: "Pipelines & Statuses", icon: GitBranch, perms: ["pipelines.manage"] },
      { href: "/dashboard/masters/branches", label: "Branches", icon: Store, perms: ["branches.manage"] },
      { href: "/dashboard/masters/sources", label: "Sources", icon: Tags, perms: ["masters.manage"] },
      { href: "/dashboard/masters/products", label: "Products", icon: Package, perms: ["masters.manage"] },
      { href: "/dashboard/masters/users", label: "Users", icon: UserCog, perms: ["users.view", "users.manage"] },
      { href: "/dashboard/masters/roles", label: "Roles & permissions", icon: ShieldCheck, perms: ["roles.manage"] },
    ],
  },
  {
    title: "Admin",
    items: [
      { href: "/dashboard/team", label: "Team", icon: UsersRound, perms: ["users.view"] },
      { href: "/dashboard/automations", label: "Automations", icon: Bot, perms: ["automations.manage"] },
      { href: "/dashboard/imports", label: "Imports", icon: Upload, perms: ["imports.run"] },
      { href: "/dashboard/settings", label: "Settings", icon: Settings, perms: ["settings.manage", "templates.manage", "integrations.manage"] },
      { href: "/dashboard/audit", label: "Audit log", icon: ScrollText, perms: ["audit.view"] },
      { href: "/dashboard/build-status", label: "Build Status", icon: ClipboardList },
      { href: "/dashboard/demo", label: "Demo panel", icon: FlaskConical, perms: ["demo.use"], demoOnly: true },
    ],
  },
];

/** The sidebar for someone holding `permissions`. Hiding links is convenience; pages and actions check again. */
export function navFor(permissions: readonly string[], demoMode: boolean) {
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => (!i.perms || i.perms.some((p) => permissions.includes(p))) && (!i.demoOnly || demoMode)),
  })).filter((g) => g.items.length > 0);
}
