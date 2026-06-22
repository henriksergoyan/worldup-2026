import Link from "next/link";

export function AdminMemberLink({
  userId,
  name,
  className,
}: {
  userId: string;
  name: string;
  className?: string;
}) {
  return (
    <Link
      href={`/admin/members/${userId}`}
      className={className ?? "font-semibold text-pitch-300 transition hover:text-pitch-200 hover:underline"}
    >
      {name}
    </Link>
  );
}
