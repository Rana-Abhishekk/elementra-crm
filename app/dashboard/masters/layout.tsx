import { requireUser } from "@/lib/auth";
import { navFor } from "@/lib/nav";
import { MastersTabs } from "./masters-tabs";

// Shared tab strip for the Masters group; each page still checks its own permission
export default async function MastersLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const tabs = navFor(user.permissions, false)
    .find((g) => g.title === "Masters")
    ?.items.map((i) => ({ href: i.href, label: i.label })) ?? [];
  return (
    <div className="mx-auto max-w-6xl">
      <MastersTabs tabs={tabs} />
      {children}
    </div>
  );
}
