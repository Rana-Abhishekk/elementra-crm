import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { navFor } from "@/lib/nav";

export default async function MastersIndex() {
  const user = await requireUser();
  const first = navFor(user.permissions, false).find((g) => g.title === "Masters")?.items[0];
  redirect(first?.href ?? "/dashboard?denied=1");
}
