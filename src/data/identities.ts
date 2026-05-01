export type Role = "booker" | "cleaner" | "reviewer";

export interface Identity {
  id: string;
  name: string;
  role: Role;
  email: string;
  avatarColor: string;
}

// IMPORTANT: cleaner and reviewer ids match entries in professionals.ts and reviewers.ts
// so the same id can be used for both identity-lookup and pro/reviewer-display lookup.
export const identities: Identity[] = [
  {
    id: "booker-1",
    name: "John Smith",
    role: "booker",
    email: "john@example.com",
    avatarColor: "#0EA5A8",
  },
  {
    id: "1",
    name: "Maria Santos",
    role: "cleaner",
    email: "maria@cleaningorg.com",
    avatarColor: "#F87171",
  },
  {
    id: "r1",
    name: "Priya Sharma",
    role: "reviewer",
    email: "priya@cleaningorg.com",
    avatarColor: "#A78BFA",
  },
];

export function getIdentity(id: string): Identity | undefined {
  return identities.find((i) => i.id === id);
}

export function getIdentityForRole(role: Role): Identity {
  const found = identities.find((i) => i.role === role);
  if (!found) throw new Error(`No demo identity for role ${role}`);
  return found;
}
