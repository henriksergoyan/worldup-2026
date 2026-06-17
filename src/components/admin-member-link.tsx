import Link from "next/link";

export function AdminMemberLink({ userId, name }: { userId: string; name: string }) {
  return (
    <Link
      href={`/admin/members/${userId}`}
      className="font-semibold text-pitch-300 transition hover:text-pitch-200 hover:underline"
    >
      {name}
    </Link>
  );
}
