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
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@prisma/client";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  feature?: string; // FeatureBadge source
  roles?: Role[]; // omitted = everyone
  demoOnly?: boolean;
}

const MGR: Role[] = ["OWNER", "ADMIN", "SALES_MANAGER"];
const ADM: Role[] = ["OWNER", "ADMIN"];

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Work",
    items: [
      { href: "/dashboard/my-day", label: "My Day", icon: Sun },
      { href: "/dashboard/leads", label: "Leads", icon: ListChecks },
      { href: "/dashboard/pipeline", label: "Pipeline", icon: SquareKanban },
      { href: "/dashboard/queues", label: "Queues", icon: Layers, roles: ["OWNER", "ADMIN", "SALES_MANAGER", "PRESALES"] },
      { href: "/dashboard/appointments", label: "Appointments", icon: CalendarCheck },
      { href: "/dashboard/inbox", label: "Inbox", icon: Inbox, feature: "F22" },
    ],
  },
  {
    title: "Insights",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/reports", label: "Reports", icon: BarChart3, roles: MGR },
      { href: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone, roles: MGR },
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
    title: "Admin",
    items: [
      { href: "/dashboard/team", label: "Team", icon: UsersRound, roles: MGR },
      { href: "/dashboard/automations", label: "Automations", icon: Bot, roles: MGR },
      { href: "/dashboard/imports", label: "Imports", icon: Upload, roles: [...ADM, "PRESALES"] },
      { href: "/dashboard/settings", label: "Settings", icon: Settings, roles: ADM },
      { href: "/dashboard/audit", label: "Audit log", icon: ScrollText, roles: ADM },
      { href: "/dashboard/build-status", label: "Build Status", icon: ClipboardList },
      { href: "/dashboard/demo", label: "Demo panel", icon: FlaskConical, roles: ADM, demoOnly: true },
    ],
  },
];

export function navForRole(role: Role, demoMode: boolean) {
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => (!i.roles || i.roles.includes(role)) && (!i.demoOnly || demoMode)),
  })).filter((g) => g.items.length > 0);
}
