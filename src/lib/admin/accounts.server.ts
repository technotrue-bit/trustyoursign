import { asAccountRole, type AccountRole } from "@/lib/auth/account-role";
import { getSql } from "@/lib/db.server";
import type { RegisteredAccount } from "./accounts";

type AccountRow = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean | null;
  createdAt: Date | string;
  lastSignedInAt: Date | string | null;
  role: string | null;
  ipAddress: string | null;
  userAgent: string | null;
};

function asIso(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function asText(value: string | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function listRegisteredAccounts(): Promise<RegisteredAccount[]> {
  const sql = await getSql();
  const rows = await sql<AccountRow>`
    select
      u."id" as id,
      u."email" as email,
      u."name" as name,
      u."emailVerified" as "emailVerified",
      u."createdAt" as "createdAt",
      u."role" as role,
      s."createdAt" as "lastSignedInAt",
      s."ipAddress" as "ipAddress",
      s."userAgent" as "userAgent"
    from "user" u
    left join lateral (
      select "ipAddress", "userAgent", "createdAt"
      from "session"
      where "userId" = u."id"
      order by "createdAt" desc
      limit 1
    ) s on true
    order by u."createdAt" desc
  `;
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    emailVerified: Boolean(row.emailVerified),
    createdAt: asIso(row.createdAt),
    lastSignedInAt: row.lastSignedInAt ? asIso(row.lastSignedInAt) : null,
    role: asAccountRole(row.role),
    ipAddress: asText(row.ipAddress),
    userAgent: asText(row.userAgent),
  }));
}

export async function setRegisteredAccountRole(
  userId: string,
  role: AccountRole,
): Promise<{ ok: true; role: AccountRole } | { ok: false; error: string }> {
  const sql = await getSql();
  const rows = await sql<{ id: string }>`
    update "user"
    set "role" = ${role}, "updatedAt" = now()
    where "id" = ${userId}
    returning "id"
  `;
  if (!rows[0]) return { ok: false, error: "No such account" };
  return { ok: true, role };
}
