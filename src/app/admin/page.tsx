import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin";
import { AdminDashboard } from "./dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const ok = await isAdminUser();
  if (!ok) redirect("/studio");
  return <AdminDashboard />;
}
