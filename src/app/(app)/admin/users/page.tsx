import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminNav } from "@/components/admin/admin-nav";
import { UserEditorRow, type AdminUserRow } from "@/components/admin/user-editor";
import { AddUserForm } from "@/components/admin/add-user-form";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] });

  const rows: AdminUserRow[] = users.map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    name: u.name,
    username: u.username,
    role: u.role,
    paid: u.paid,
    active: u.active,
    plainPassword: u.plainPassword,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black text-white md:text-3xl">Մասնակիցներ</h1>
        <p className="text-sm text-navy-300">
          Ավելացրեք մասնակիցներ, խմբագրեք անունները (օգտանունը թարմացվում է ավտոմատ), դիտեք գաղտնաբառերը (ներառյալ
          մասնակիցների ինքնուրույն փոխածները) կամ վերակայեք դրանք։ Ադմինիստրատորի հաշիվները նախատեսված են միայն
          լիգայի կառավարման համար։
        </p>
      </div>
      <AdminNav />
      <AddUserForm />

      <div className="space-y-3">
        {rows.map((u) => (
          <UserEditorRow key={u.id} user={u} />
        ))}
      </div>
    </div>
  );
}
