import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ChangePasswordForm } from "@/components/change-password-form";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser();
  if (user.role === "ADMIN") redirect("/admin");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black text-white md:text-3xl">Իմ հաշիվը</h1>
        <p className="mt-1 text-sm text-navy-300">Կառավարեք մուտքի տվյալները</p>
      </div>

      <Card className="border-white/10">
        <CardContent className="pt-5">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-navy-400">Անուն</dt>
              <dd className="font-semibold text-white">{user.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-navy-400">Մուտքանուն</dt>
              <dd className="font-mono text-pitch-300">{user.username}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <ChangePasswordForm username={user.username} />
    </div>
  );
}
