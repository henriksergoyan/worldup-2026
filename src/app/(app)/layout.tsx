import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { NavBar } from "@/components/nav-bar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-1 flex-col">
      <NavBar user={{ name: user.name, role: user.role }} />
      <main className="px-safe mx-auto w-full max-w-6xl flex-1 py-6 md:py-8">{children}</main>
    </div>
  );
}
