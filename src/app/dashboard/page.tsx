import { redirect } from "next/navigation";

// Legacy path — the dashboard now lives at top-level routes (/studio, /content, ...).
export default function DashboardRedirect() {
  redirect("/studio");
}
