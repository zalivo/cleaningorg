# End-to-End Booking — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the customer-only mock UI into a working three-sided cleaning marketplace where a job moves through a real state machine driven by three distinct user roles, with state persisted across reloads.

**Architecture:** Two persisted Zustand stores (jobs + active identity), AsyncStorage-backed. Role-aware Expo Router tabs (per-tab `href: null` + role-dependent labels). One shared job-detail screen with role-conditional action panels. No real auth — three seeded demo identities.

**Tech Stack:** Expo Router 55, React Native 0.83, React 19, TypeScript 5.9, Zustand (new), `@react-native-async-storage/async-storage` (new). Bun for installs.

**Spec:** [`docs/superpowers/specs/2026-05-01-end-to-end-booking-design.md`](../specs/2026-05-01-end-to-end-booking-design.md)

---

## Phase plan

```
Phase 0 — Foundation (sequential, blocks all)
  Task A: stores + types + seed data + deps

Phase 1 — Parallel (each task self-contained, all depend on A)
  Task B: role-aware tabs + jobs list + history list + JobCard
  Task C: shared job-detail screen + state transitions
  Task D: book flow rewire (cleaner+reviewer pickers, write to store)
  Task E: profile identity switcher + reset

Phase 2 — Integration (sequential, depends on B+C+D+E)
  Task F: manual E2E + polish

Phase 3 — Stretch (parallel, depend on F)
  Task G: room checklist UI + optional photo
  Task H: state-change toasts
```

## Distribution suggestion (3 people)

| Person | Phase 0 | Phase 1 | Phase 2 | Phase 3 |
|--------|---------|---------|---------|---------|
| Lead (you) | **A** | **B** + **E** | **F** (driver) | **G** |
| Teammate 1 | — | **C** | participate | **H** |
| Teammate 2 | — | **D** | participate | help with G or H |

**Hard rule:** nobody starts Phase 1 until A is committed and pushed.

---

## Conventions across all tasks

- Type-check before each commit: `bunx tsc --noEmit`. If it fails, do not commit.
- Commit per task using a HEREDOC body and the format shown in each Step "Commit".
- Push after committing so other team members can rebase.
- File names use kebab-case (`jobs/[id].tsx`, `job-card.tsx`). React component names use PascalCase.
- All paths in this plan are relative to repo root `/Users/glenn/Code/personal/cleaningorg`.
- Brand colors live in `src/constants/colors.ts` — `BRAND` (`#0EA5A8`), `BRAND_LIGHT` (`#E6F7F7`).
- Use `useTheme()` from `@react-navigation/native` for `colors.background`, `colors.card`, `colors.text`, `colors.border`.

---

## Task A — Foundation (Phase 0)

**Owner:** Lead. Must complete and push before Phase 1 starts.

**Goal:** install deps, add stores + types + seeds. Do NOT modify any existing UI in this task — Phase 1 will migrate consumers.

**Files:**
- Create: `src/data/identities.ts`
- Create: `src/data/reviewers.ts`
- Create: `src/data/jobs.ts`
- Create: `src/store/identity.ts`
- Create: `src/store/jobs.ts`
- Modify: `package.json` (deps via `bunx expo add`)

**Note:** The existing `src/data/bookings.ts` is left untouched in this task. Task B is responsible for migrating consumers off it and deleting it.

- [ ] **A.1 — Install dependencies**

```bash
bunx expo add @react-native-async-storage/async-storage zustand
```

Verify both appear in `package.json` `dependencies`.

- [ ] **A.2 — Create `src/data/identities.ts`**

```ts
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
```

- [ ] **A.3 — Create `src/data/reviewers.ts`**

```ts
export interface Reviewer {
  id: string;
  name: string;
  rating: number;
  reviewsCompleted: number;
  bio: string;
  avatarColor: string;
}

export const reviewers: Reviewer[] = [
  {
    id: "r1",
    name: "Priya Sharma",
    rating: 4.9,
    reviewsCompleted: 234,
    bio: "Quality assurance specialist with 6 years of experience.",
    avatarColor: "#A78BFA",
  },
  {
    id: "r2",
    name: "Tom Williams",
    rating: 4.8,
    reviewsCompleted: 187,
    bio: "Detail-focused reviewer with property management background.",
    avatarColor: "#FBBF24",
  },
  {
    id: "r3",
    name: "Elena Rossi",
    rating: 5.0,
    reviewsCompleted: 312,
    bio: "Senior inspector — commercial and residential.",
    avatarColor: "#34D399",
  },
];

export function getReviewer(id: string): Reviewer | undefined {
  return reviewers.find((r) => r.id === id);
}
```

- [ ] **A.4 — Create `src/data/jobs.ts`**

```ts
import type { ServiceId } from "./services";

export type JobStatus =
  | "ready-to-clean"
  | "cleaning"
  | "ready-for-review"
  | "reviewing"
  | "done"
  | "cancelled";

export interface ChecklistItem {
  room: string;
  done: boolean;
}

export interface Job {
  id: string;
  serviceId: ServiceId;
  serviceName: string;
  bookerId: string;
  cleanerId: string;
  cleanerName: string;
  reviewerId: string;
  reviewerName: string;
  date: string; // ISO
  address: string;
  notes?: string;
  totalPrice: number;
  status: JobStatus;
  checklist?: ChecklistItem[];
  photoUri?: string;
  declineReason?: string;
  declineCount: number;
  createdAt: string; // ISO
}

export const seedJobs: Job[] = [
  {
    id: "j1",
    serviceId: "standard",
    serviceName: "Standard Clean",
    bookerId: "booker-1",
    cleanerId: "1",
    cleanerName: "Maria Santos",
    reviewerId: "r1",
    reviewerName: "Priya Sharma",
    date: "2026-05-04T10:00:00.000Z",
    address: "742 Evergreen Terrace",
    totalPrice: 80,
    status: "ready-to-clean",
    declineCount: 0,
    createdAt: "2026-05-01T08:00:00.000Z",
  },
  {
    id: "j2",
    serviceId: "deep",
    serviceName: "Deep Clean",
    bookerId: "booker-1",
    cleanerId: "1",
    cleanerName: "Maria Santos",
    reviewerId: "r2",
    reviewerName: "Tom Williams",
    date: "2026-05-02T09:00:00.000Z",
    address: "742 Evergreen Terrace",
    totalPrice: 150,
    status: "ready-for-review",
    checklist: [
      { room: "Kitchen", done: true },
      { room: "Bathroom", done: true },
      { room: "Living areas", done: true },
      { room: "Bedrooms", done: true },
    ],
    declineCount: 0,
    createdAt: "2026-04-30T08:00:00.000Z",
  },
  {
    id: "j3",
    serviceId: "office",
    serviceName: "Office Clean",
    bookerId: "booker-1",
    cleanerId: "3",
    cleanerName: "Aisha Patel",
    reviewerId: "r1",
    reviewerName: "Priya Sharma",
    date: "2026-04-15T18:00:00.000Z",
    address: "500 Market St, Floor 3",
    totalPrice: 120,
    status: "done",
    declineCount: 0,
    createdAt: "2026-04-14T08:00:00.000Z",
  },
];

export function formatJobDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
```

- [ ] **A.5 — Create `src/store/identity.ts`**

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { identities, type Identity } from "@/data/identities";

interface IdentityState {
  activeIdentityId: string;
  setActiveIdentity: (id: string) => void;
}

export const useIdentityStore = create<IdentityState>()(
  persist(
    (set) => ({
      activeIdentityId: identities[0].id,
      setActiveIdentity: (id) => set({ activeIdentityId: id }),
    }),
    {
      name: "cleaningorg/identity",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export function useActiveIdentity(): Identity {
  const id = useIdentityStore((s) => s.activeIdentityId);
  return identities.find((i) => i.id === id) ?? identities[0];
}
```

- [ ] **A.6 — Create `src/store/jobs.ts`**

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  type ChecklistItem,
  type Job,
  seedJobs,
} from "@/data/jobs";
import { getService, type ServiceId } from "@/data/services";

const SERVICE_ROOMS: Record<ServiceId, string[]> = {
  standard: ["Kitchen", "Bathroom", "Living areas", "Bedrooms"],
  deep: ["Kitchen", "Bathroom", "Living areas", "Bedrooms", "Inside appliances", "Windows"],
  "move-out": ["Kitchen", "Bathroom", "Bedrooms", "Closets", "Floors", "Walls"],
  office: ["Desks", "Breakroom", "Bathrooms", "Common areas"],
  "post-construction": ["Dust removal", "Floors", "Windows", "Fixtures"],
};

export interface BookJobInput {
  serviceId: ServiceId;
  bookerId: string;
  cleanerId: string;
  cleanerName: string;
  reviewerId: string;
  reviewerName: string;
  date: string;
  address: string;
  notes?: string;
}

interface JobsState {
  jobs: Job[];
  bookJob: (input: BookJobInput) => Job;
  startCleaning: (jobId: string) => void;
  finishCleaning: (jobId: string) => void;
  startReview: (jobId: string) => void;
  approve: (jobId: string) => void;
  decline: (jobId: string, reason: string) => void;
  cancel: (jobId: string) => void;
  toggleChecklist: (jobId: string, room: string) => void;
  setPhoto: (jobId: string, uri: string) => void;
  resetDemo: () => void;
}

function patch(jobs: Job[], jobId: string, fn: (j: Job) => Partial<Job>): Job[] {
  return jobs.map((j) => (j.id === jobId ? { ...j, ...fn(j) } : j));
}

export const useJobsStore = create<JobsState>()(
  persist(
    (set) => ({
      jobs: seedJobs,
      bookJob: (input) => {
        const service = getService(input.serviceId);
        const job: Job = {
          id: `j${Date.now()}`,
          serviceId: input.serviceId,
          serviceName: service?.name ?? input.serviceId,
          bookerId: input.bookerId,
          cleanerId: input.cleanerId,
          cleanerName: input.cleanerName,
          reviewerId: input.reviewerId,
          reviewerName: input.reviewerName,
          date: input.date,
          address: input.address,
          notes: input.notes,
          totalPrice: service?.price ?? 0,
          status: "ready-to-clean",
          declineCount: 0,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ jobs: [job, ...s.jobs] }));
        return job;
      },
      startCleaning: (jobId) => {
        set((s) => ({
          jobs: patch(s.jobs, jobId, (j) => {
            if (j.status !== "ready-to-clean") return {};
            const rooms = SERVICE_ROOMS[j.serviceId] ?? ["Whole space"];
            const checklist: ChecklistItem[] =
              j.checklist?.map((c) => ({ ...c, done: false })) ??
              rooms.map((room) => ({ room, done: false }));
            return { status: "cleaning", checklist };
          }),
        }));
      },
      finishCleaning: (jobId) => {
        set((s) => ({
          jobs: patch(s.jobs, jobId, (j) =>
            j.status === "cleaning" ? { status: "ready-for-review" } : {}
          ),
        }));
      },
      startReview: (jobId) => {
        set((s) => ({
          jobs: patch(s.jobs, jobId, (j) =>
            j.status === "ready-for-review" ? { status: "reviewing" } : {}
          ),
        }));
      },
      approve: (jobId) => {
        set((s) => ({
          jobs: patch(s.jobs, jobId, (j) =>
            j.status === "reviewing" ? { status: "done" } : {}
          ),
        }));
      },
      decline: (jobId, reason) => {
        set((s) => ({
          jobs: patch(s.jobs, jobId, (j) =>
            j.status === "reviewing"
              ? {
                  status: "ready-to-clean",
                  declineReason: reason,
                  declineCount: j.declineCount + 1,
                  checklist: j.checklist?.map((c) => ({ ...c, done: false })),
                }
              : {}
          ),
        }));
      },
      cancel: (jobId) => {
        set((s) => ({
          jobs: patch(s.jobs, jobId, (j) =>
            j.status === "ready-to-clean" ? { status: "cancelled" } : {}
          ),
        }));
      },
      toggleChecklist: (jobId, room) => {
        set((s) => ({
          jobs: patch(s.jobs, jobId, (j) => {
            if (j.status !== "cleaning" || !j.checklist) return {};
            return {
              checklist: j.checklist.map((c) =>
                c.room === room ? { ...c, done: !c.done } : c
              ),
            };
          }),
        }));
      },
      setPhoto: (jobId, uri) => {
        set((s) => ({
          jobs: patch(s.jobs, jobId, (j) =>
            j.status === "cleaning" ? { photoUri: uri } : {}
          ),
        }));
      },
      resetDemo: () => set({ jobs: seedJobs }),
    }),
    {
      name: "cleaningorg/jobs",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ---------------- Selector hooks (used by screens) ----------------

export function useJobsForBooker(bookerId: string): Job[] {
  return useJobsStore((s) =>
    s.jobs.filter(
      (j) =>
        j.bookerId === bookerId &&
        j.status !== "done" &&
        j.status !== "cancelled"
    )
  );
}

export function useJobsForCleaner(cleanerId: string): Job[] {
  return useJobsStore((s) =>
    s.jobs.filter(
      (j) =>
        j.cleanerId === cleanerId &&
        (j.status === "ready-to-clean" ||
          j.status === "cleaning" ||
          j.status === "ready-for-review")
    )
  );
}

export function useJobsForReviewer(reviewerId: string): Job[] {
  return useJobsStore((s) =>
    s.jobs.filter(
      (j) =>
        j.reviewerId === reviewerId &&
        (j.status === "ready-for-review" || j.status === "reviewing")
    )
  );
}

export function useHistoryForCleaner(cleanerId: string): Job[] {
  return useJobsStore((s) =>
    s.jobs.filter(
      (j) =>
        j.cleanerId === cleanerId &&
        (j.status === "done" || j.status === "cancelled")
    )
  );
}

export function useHistoryForReviewer(reviewerId: string): Job[] {
  return useJobsStore((s) =>
    s.jobs.filter((j) => j.reviewerId === reviewerId && j.status === "done")
  );
}

export function useJob(jobId: string): Job | undefined {
  return useJobsStore((s) => s.jobs.find((j) => j.id === jobId));
}
```

- [ ] **A.7 — Type-check**

```bash
bunx tsc --noEmit
```

Expected: zero errors. If errors point at the new files, fix them. If errors point at existing files (e.g. `bookings.tsx` still importing the old `Booking` type), that's expected — A leaves the old file alone; B will migrate.

NOTE: TypeScript should NOT complain about `bookings.ts` because A doesn't change it. If it does, you've accidentally edited it — revert.

- [ ] **A.8 — Commit & push**

```bash
git add package.json bun.lock src/data/identities.ts src/data/reviewers.ts src/data/jobs.ts src/store/identity.ts src/store/jobs.ts
git commit -m "$(cat <<'EOF'
Add foundation for end-to-end booking

Adds Zustand stores for jobs and active identity (AsyncStorage-persisted),
plus seed data for identities, reviewers, and jobs. Existing bookings.ts is
left untouched; migration handled in the tabs/list task.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push
```

---

## Task B — Tabs & lists (Phase 1, parallel)

**Owner:** Lead.

**Goal:** Role-aware tab layout. Migrate the Bookings screen to a role-filtered Jobs screen, add a History screen, replace `BookingCard` with a `JobCard`, and delete the old `bookings.ts`.

**Depends on:** Task A pushed.

**Files:**
- Modify: `src/app/(tabs)/_layout.tsx` (role-aware tabs)
- Create: `src/app/(tabs)/jobs.tsx` (role-filtered list — replaces `bookings.tsx`)
- Create: `src/app/(tabs)/history.tsx` (cleaner/reviewer history)
- Create: `src/components/job-card.tsx` (replaces `booking-card.tsx`)
- Delete: `src/app/(tabs)/bookings.tsx`
- Delete: `src/components/booking-card.tsx`
- Delete: `src/data/bookings.ts`

**Coordination note:** Task D writes new bookings and routes the user to `/(tabs)/jobs`. Task C creates `jobs/[id].tsx`. The route name `jobs` is locked.

- [ ] **B.1 — Create `src/components/job-card.tsx`**

```tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@react-navigation/native";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { BRAND, BRAND_LIGHT } from "@/constants/colors";
import { type Job, type JobStatus, formatJobDate } from "@/data/jobs";

interface Props {
  job: Job;
  onPress?: () => void;
}

const STATUS_STYLES: Record<JobStatus, { bg: string; fg: string; label: string }> = {
  "ready-to-clean": { bg: BRAND_LIGHT, fg: BRAND, label: "Ready to clean" },
  cleaning: { bg: "#FEF3C7", fg: "#B45309", label: "Cleaning" },
  "ready-for-review": { bg: "#DBEAFE", fg: "#1D4ED8", label: "Ready for review" },
  reviewing: { bg: "#EDE9FE", fg: "#6D28D9", label: "Reviewing" },
  done: { bg: "#E5E7EB", fg: "#374151", label: "Done" },
  cancelled: { bg: "#FEE2E2", fg: "#B91C1C", label: "Cancelled" },
};

export function JobCard({ job, onPress }: Props) {
  const { colors } = useTheme();
  const status = STATUS_STYLES[job.status];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.service, { color: colors.text }]}>
          {job.serviceName}
        </Text>
        <View style={[styles.pill, { backgroundColor: status.bg }]}>
          <Text style={[styles.pillText, { color: status.fg }]}>
            {status.label}
          </Text>
        </View>
      </View>
      <View style={styles.row}>
        <Ionicons name="person-circle-outline" size={16} color={colors.text} />
        <Text style={[styles.meta, { color: colors.text }]}>
          {job.cleanerName} · reviewer {job.reviewerName}
        </Text>
      </View>
      <View style={styles.row}>
        <Ionicons name="calendar-outline" size={16} color={colors.text} />
        <Text style={[styles.meta, { color: colors.text }]}>
          {formatJobDate(job.date)}
        </Text>
      </View>
      <View style={styles.row}>
        <Ionicons name="location-outline" size={16} color={colors.text} />
        <Text style={[styles.meta, { color: colors.text }]} numberOfLines={1}>
          {job.address}
        </Text>
      </View>
      {job.declineCount > 0 && (
        <View style={[styles.row, styles.declineRow]}>
          <Ionicons name="alert-circle-outline" size={14} color="#B91C1C" />
          <Text style={styles.declineText} numberOfLines={2}>
            Declined {job.declineCount}× — {job.declineReason}
          </Text>
        </View>
      )}
      <View style={styles.footer}>
        <Text style={[styles.price, { color: BRAND }]}>${job.totalPrice}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  service: { fontSize: 16, fontWeight: "600", flex: 1, paddingRight: 8 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  meta: { fontSize: 13, opacity: 0.85, flex: 1 },
  declineRow: { backgroundColor: "#FEE2E2", padding: 6, borderRadius: 6 },
  declineText: { fontSize: 12, color: "#B91C1C", flex: 1 },
  footer: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  price: { fontSize: 16, fontWeight: "700" },
});
```

- [ ] **B.2 — Create `src/app/(tabs)/jobs.tsx`** (this REPLACES `bookings.tsx`)

```tsx
import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { JobCard } from "@/components/job-card";
import type { Job } from "@/data/jobs";
import { useActiveIdentity } from "@/store/identity";
import {
  useJobsForBooker,
  useJobsForCleaner,
  useJobsForReviewer,
} from "@/store/jobs";

const TITLES: Record<string, string> = {
  booker: "My Bookings",
  cleaner: "My Jobs",
  reviewer: "To Review",
};

export default function JobsRoute() {
  const { colors } = useTheme();
  const router = useRouter();
  const identity = useActiveIdentity();

  const bookerJobs = useJobsForBooker(identity.id);
  const cleanerJobs = useJobsForCleaner(identity.id);
  const reviewerJobs = useJobsForReviewer(identity.id);

  const jobs: Job[] =
    identity.role === "booker"
      ? bookerJobs
      : identity.role === "cleaner"
        ? cleanerJobs
        : reviewerJobs;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top"]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          {TITLES[identity.role]}
        </Text>
        {jobs.length === 0 ? (
          <Text style={[styles.empty, { color: colors.text }]}>
            Nothing here yet.
          </Text>
        ) : (
          jobs.map((j) => (
            <JobCard
              key={j.id}
              job={j}
              onPress={() => router.push(`/jobs/${j.id}`)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 4 },
  empty: { fontSize: 14, opacity: 0.6, paddingVertical: 8 },
});
```

- [ ] **B.3 — Create `src/app/(tabs)/history.tsx`**

```tsx
import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { JobCard } from "@/components/job-card";
import { useActiveIdentity } from "@/store/identity";
import {
  useHistoryForCleaner,
  useHistoryForReviewer,
} from "@/store/jobs";

export default function HistoryRoute() {
  const { colors } = useTheme();
  const router = useRouter();
  const identity = useActiveIdentity();

  const cleanerHistory = useHistoryForCleaner(identity.id);
  const reviewerHistory = useHistoryForReviewer(identity.id);

  const jobs = identity.role === "cleaner" ? cleanerHistory : reviewerHistory;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top"]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>History</Text>
        {jobs.length === 0 ? (
          <Text style={[styles.empty, { color: colors.text }]}>
            No completed work yet.
          </Text>
        ) : (
          jobs.map((j) => (
            <JobCard
              key={j.id}
              job={j}
              onPress={() => router.push(`/jobs/${j.id}`)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 4 },
  empty: { fontSize: 14, opacity: 0.6, paddingVertical: 8 },
});
```

- [ ] **B.4 — Replace `src/app/(tabs)/_layout.tsx`** with role-aware tabs

```tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@react-navigation/native";
import { Tabs } from "expo-router";
import { BRAND } from "@/constants/colors";
import { useActiveIdentity } from "@/store/identity";

export default function TabsLayout() {
  const { colors } = useTheme();
  const identity = useActiveIdentity();
  const role = identity.role;

  const jobsLabel =
    role === "booker"
      ? "My Bookings"
      : role === "cleaner"
        ? "My Jobs"
        : "To Review";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BRAND,
        tabBarInactiveTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          href: role === "booker" ? "/" : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: jobsLabel,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          href: role === "booker" ? null : "/history",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
```

- [ ] **B.5 — Update `src/app/(tabs)/index.tsx` Home links**

The home screen currently links to `/book` — that's fine and stays. Verify by inspecting the file; no changes required unless it imports from `@/data/bookings`. Run grep:

```bash
grep -rn "@/data/bookings\|@/components/booking-card" src/
```

Expected to print only `src/app/(tabs)/bookings.tsx` and `src/components/booking-card.tsx` (the files about to be deleted). If anything else appears, update it to import from `@/data/jobs` and `@/components/job-card` respectively.

- [ ] **B.6 — Delete the old files**

```bash
rm src/app/(tabs)/bookings.tsx src/components/booking-card.tsx src/data/bookings.ts
```

- [ ] **B.7 — Type-check**

```bash
bunx tsc --noEmit
```

Expected: zero errors.

- [ ] **B.8 — Commit & push**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Add role-aware tabs with role-filtered jobs and history lists

Replaces Bookings tab with a role-filtered Jobs tab, adds History tab for
cleaner and reviewer, and renames BookingCard to JobCard. Deletes the old
bookings module.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push
```

---

## Task C — Job detail screen + state transitions (Phase 1, parallel)

**Owner:** Teammate 1.

**Goal:** Build the shared job-detail screen at `src/app/jobs/[id].tsx` with a role-conditional action panel. All state transitions are wired through it.

**Depends on:** Task A pushed.

**Files:**
- Create: `src/app/jobs/[id].tsx`
- Modify: `src/app/_layout.tsx` (add Stack.Screen for `jobs/[id]`; can keep existing `pros/[id]`)

**Locked routes from Task B:** the Jobs tab is `/(tabs)/jobs`; this detail screen lives at `/jobs/[id]` (top-level stack, NOT inside `(tabs)`).

- [ ] **C.1 — Add `Stack.Screen` for `jobs/[id]` in `src/app/_layout.tsx`**

Current file content (read it first to confirm). Replace the `Stack` block so it reads:

```tsx
import { ThemeProvider } from "@/components/theme-provider";
import { Stack } from "expo-router";

export default function Layout() {
  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="book"
          options={{
            presentation: "modal",
            headerShown: true,
            title: "Book a Cleaning",
          }}
        />
        <Stack.Screen
          name="pros/[id]"
          options={{ headerShown: true, title: "" }}
        />
        <Stack.Screen
          name="jobs/[id]"
          options={{ headerShown: true, title: "Job Details" }}
        />
      </Stack>
    </ThemeProvider>
  );
}
```

- [ ] **C.2 — Create `src/app/jobs/[id].tsx`**

```tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { BRAND, BRAND_LIGHT } from "@/constants/colors";
import { type JobStatus, formatJobDate } from "@/data/jobs";
import { useActiveIdentity } from "@/store/identity";
import { useJob, useJobsStore } from "@/store/jobs";

const STATUS_STYLES: Record<JobStatus, { bg: string; fg: string; label: string }> = {
  "ready-to-clean": { bg: BRAND_LIGHT, fg: BRAND, label: "Ready to clean" },
  cleaning: { bg: "#FEF3C7", fg: "#B45309", label: "Cleaning" },
  "ready-for-review": { bg: "#DBEAFE", fg: "#1D4ED8", label: "Ready for review" },
  reviewing: { bg: "#EDE9FE", fg: "#6D28D9", label: "Reviewing" },
  done: { bg: "#E5E7EB", fg: "#374151", label: "Done" },
  cancelled: { bg: "#FEE2E2", fg: "#B91C1C", label: "Cancelled" },
};

export default function JobDetailRoute() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const job = useJob(id);
  const identity = useActiveIdentity();
  const actions = useJobsStore();

  const [declineMode, setDeclineMode] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  if (!job) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Job not found.</Text>
      </View>
    );
  }

  const status = STATUS_STYLES[job.status];
  const isAssignedCleaner =
    identity.role === "cleaner" && identity.id === job.cleanerId;
  const isAssignedReviewer =
    identity.role === "reviewer" && identity.id === job.reviewerId;
  const isOwnerBooker =
    identity.role === "booker" && identity.id === job.bookerId;

  function confirmCancel() {
    const ok = () => actions.cancel(job!.id);
    if (Platform.OS === "web") {
      if (window.confirm("Cancel this booking?")) ok();
    } else {
      Alert.alert("Cancel booking?", "This cannot be undone.", [
        { text: "Keep", style: "cancel" },
        { text: "Cancel booking", style: "destructive", onPress: ok },
      ]);
    }
  }

  function submitDecline() {
    const reason = declineReason.trim();
    if (!reason) return;
    actions.decline(job!.id, reason);
    setDeclineMode(false);
    setDeclineReason("");
    router.back();
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
        <Text style={[styles.statusText, { color: status.fg }]}>
          {status.label}
        </Text>
      </View>

      {job.declineCount > 0 && job.declineReason && (
        <View style={styles.declineBanner}>
          <Ionicons name="alert-circle" size={16} color="#B91C1C" />
          <Text style={styles.declineText}>
            Declined {job.declineCount}× — last reason: {job.declineReason}
          </Text>
        </View>
      )}

      <Text style={[styles.title, { color: colors.text }]}>{job.serviceName}</Text>
      <View
        style={[
          styles.summary,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Row icon="calendar-outline" text={formatJobDate(job.date)} />
        <Row icon="location-outline" text={job.address} />
        <Row icon="person-circle-outline" text={`Cleaner: ${job.cleanerName}`} />
        <Row icon="shield-checkmark-outline" text={`Reviewer: ${job.reviewerName}`} />
        {job.notes && <Row icon="document-text-outline" text={job.notes} />}
        <Row icon="cash-outline" text={`$${job.totalPrice}`} />
      </View>

      {/* ---- Booker actions ---- */}
      {isOwnerBooker && job.status === "ready-to-clean" && (
        <Pressable
          onPress={confirmCancel}
          style={({ pressed }) => [
            styles.btnDanger,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={styles.btnDangerText}>Cancel booking</Text>
        </Pressable>
      )}

      {/* ---- Cleaner actions ---- */}
      {isAssignedCleaner && job.status === "ready-to-clean" && (
        <Pressable
          onPress={() => actions.startCleaning(job.id)}
          style={({ pressed }) => [
            styles.btnPrimary,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.btnPrimaryText}>Start cleaning</Text>
        </Pressable>
      )}
      {isAssignedCleaner && job.status === "cleaning" && (
        <Pressable
          onPress={() => actions.finishCleaning(job.id)}
          style={({ pressed }) => [
            styles.btnPrimary,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.btnPrimaryText}>Mark ready for review</Text>
        </Pressable>
      )}

      {/* ---- Reviewer actions ---- */}
      {isAssignedReviewer && job.status === "ready-for-review" && (
        <Pressable
          onPress={() => actions.startReview(job.id)}
          style={({ pressed }) => [
            styles.btnPrimary,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.btnPrimaryText}>Start review</Text>
        </Pressable>
      )}
      {isAssignedReviewer && job.status === "reviewing" && !declineMode && (
        <View style={{ gap: 10 }}>
          <Pressable
            onPress={() => {
              actions.approve(job.id);
              router.back();
            }}
            style={({ pressed }) => [
              styles.btnPrimary,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.btnPrimaryText}>Approve</Text>
          </Pressable>
          <Pressable
            onPress={() => setDeclineMode(true)}
            style={({ pressed }) => [
              styles.btnDanger,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.btnDangerText}>Decline</Text>
          </Pressable>
        </View>
      )}
      {isAssignedReviewer && job.status === "reviewing" && declineMode && (
        <View
          style={[
            styles.declineForm,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.formLabel, { color: colors.text }]}>
            Reason for decline
          </Text>
          <TextInput
            value={declineReason}
            onChangeText={setDeclineReason}
            placeholder="What needs to be redone?"
            placeholderTextColor={colors.text + "80"}
            multiline
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => {
                setDeclineMode(false);
                setDeclineReason("");
              }}
              style={({ pressed }) => [
                styles.btnSecondary,
                { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.btnSecondaryText, { color: colors.text }]}>
                Back
              </Text>
            </Pressable>
            <Pressable
              onPress={submitDecline}
              disabled={!declineReason.trim()}
              style={({ pressed }) => [
                styles.btnDanger,
                {
                  flex: 1,
                  opacity: !declineReason.trim() ? 0.4 : pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={styles.btnDangerText}>Submit decline</Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function Row({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={16} color={colors.text} />
      <Text style={[styles.rowText, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: { fontSize: 12, fontWeight: "700" },
  declineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    padding: 10,
    borderRadius: 10,
  },
  declineText: { fontSize: 13, color: "#B91C1C", flex: 1 },
  title: { fontSize: 24, fontWeight: "700" },
  summary: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowText: { fontSize: 14, flex: 1 },
  btnPrimary: {
    backgroundColor: BRAND,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnPrimaryText: { color: "white", fontSize: 16, fontWeight: "700" },
  btnDanger: {
    backgroundColor: "#DC2626",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnDangerText: { color: "white", fontSize: 16, fontWeight: "700" },
  btnSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  btnSecondaryText: { fontSize: 15, fontWeight: "600" },
  declineForm: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  formLabel: { fontSize: 14, fontWeight: "600" },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: "top",
    fontSize: 14,
  },
});
```

- [ ] **C.3 — Type-check**

```bash
bunx tsc --noEmit
```

Expected: zero errors.

- [ ] **C.4 — Commit & push**

```bash
git add src/app/_layout.tsx src/app/jobs/
git commit -m "$(cat <<'EOF'
Add shared job detail screen with role-conditional actions

Wires booker cancel, cleaner start/finish, and reviewer start/approve/decline
transitions through the jobs store. Decline requires a non-empty reason.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push
```

---

## Task D — Book flow rewire (Phase 1, parallel)

**Owner:** Teammate 2.

**Goal:** Add Cleaner picker and Reviewer picker to `book.tsx`. The Confirm button writes a real Job via the store and navigates to `/(tabs)/jobs`.

**Depends on:** Task A pushed.

**Files:**
- Modify: `src/app/book.tsx` (full rewrite)

**Locked from Task B:** post-confirm route is `/(tabs)/jobs`. **Locked from Task A:** the booker identity id is `"booker-1"`.

- [ ] **D.1 — Replace `src/app/book.tsx`** with the version below

```tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { BRAND, BRAND_LIGHT } from "@/constants/colors";
import { getProfessional, professionals } from "@/data/professionals";
import { reviewers } from "@/data/reviewers";
import { type ServiceId, services } from "@/data/services";
import { useActiveIdentity } from "@/store/identity";
import { useJobsStore } from "@/store/jobs";

const DATE_OPTIONS = [
  { id: "tomorrow", label: "Tomorrow", offsetDays: 1 },
  { id: "in-2-days", label: "In 2 days", offsetDays: 2 },
  { id: "weekend", label: "This weekend", offsetDays: 5 },
  { id: "next-week", label: "Next week", offsetDays: 7 },
];

const TIME_OPTIONS = [
  { id: "morning", label: "Morning", hint: "8am – 12pm", hour: 9 },
  { id: "afternoon", label: "Afternoon", hint: "12pm – 5pm", hour: 14 },
  { id: "evening", label: "Evening", hint: "5pm – 9pm", hour: 18 },
];

function resolveDate(dateId: string, timeId: string): string {
  const dOpt = DATE_OPTIONS.find((d) => d.id === dateId) ?? DATE_OPTIONS[0];
  const tOpt = TIME_OPTIONS.find((t) => t.id === timeId) ?? TIME_OPTIONS[0];
  const d = new Date();
  d.setDate(d.getDate() + dOpt.offsetDays);
  d.setHours(tOpt.hour, 0, 0, 0);
  return d.toISOString();
}

function notify(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function BookRoute() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ serviceId?: string; proId?: string }>();
  const identity = useActiveIdentity();
  const bookJob = useJobsStore((s) => s.bookJob);

  const initialService = params.serviceId
    ? (params.serviceId as ServiceId)
    : services[0].id;
  const preselectedPro = params.proId ? getProfessional(params.proId) : undefined;

  const [serviceId, setServiceId] = useState<ServiceId>(initialService);
  const [dateId, setDateId] = useState<string>(DATE_OPTIONS[0].id);
  const [timeId, setTimeId] = useState<string>(TIME_OPTIONS[0].id);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [cleanerId, setCleanerId] = useState<string>(
    preselectedPro?.id ?? professionals[0].id
  );
  const [reviewerId, setReviewerId] = useState<string>(reviewers[0].id);

  const service = services.find((s) => s.id === serviceId)!;

  const handleConfirm = () => {
    if (!address.trim()) {
      notify("Address required", "Please enter the address for the cleaning.");
      return;
    }
    if (!cleanerId) {
      notify("Cleaner required", "Please pick a cleaner.");
      return;
    }
    if (!reviewerId) {
      notify("Reviewer required", "Please pick a reviewer.");
      return;
    }
    if (identity.role !== "booker") {
      notify(
        "Switch to booker",
        "Only the booker identity can create new bookings. Switch from the Profile tab."
      );
      return;
    }

    const cleaner = getProfessional(cleanerId);
    const reviewer = reviewers.find((r) => r.id === reviewerId);
    if (!cleaner || !reviewer) {
      notify("Booking failed", "Selected cleaner or reviewer no longer exists.");
      return;
    }

    bookJob({
      serviceId,
      bookerId: identity.id,
      cleanerId: cleaner.id,
      cleanerName: cleaner.name,
      reviewerId: reviewer.id,
      reviewerName: reviewer.name,
      date: resolveDate(dateId, timeId),
      address: address.trim(),
      notes: notes.trim() || undefined,
    });

    router.replace("/(tabs)/jobs");
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      {preselectedPro && (
        <View style={[styles.proBanner, { backgroundColor: BRAND_LIGHT }]}>
          <Ionicons name="person-circle" size={20} color={BRAND} />
          <Text style={styles.proBannerText}>
            Pre-selected:{" "}
            <Text style={{ fontWeight: "700" }}>{preselectedPro.name}</Text>
          </Text>
        </View>
      )}

      <Field label="Service">
        <View style={styles.chipsWrap}>
          {services.map((s) => (
            <Chip
              key={s.id}
              label={s.name}
              selected={s.id === serviceId}
              onPress={() => setServiceId(s.id)}
            />
          ))}
        </View>
      </Field>

      <Field label="Date">
        <View style={styles.chipsWrap}>
          {DATE_OPTIONS.map((d) => (
            <Chip
              key={d.id}
              label={d.label}
              selected={d.id === dateId}
              onPress={() => setDateId(d.id)}
            />
          ))}
        </View>
      </Field>

      <Field label="Time">
        <View style={styles.chipsWrap}>
          {TIME_OPTIONS.map((t) => (
            <Chip
              key={t.id}
              label={t.label}
              hint={t.hint}
              selected={t.id === timeId}
              onPress={() => setTimeId(t.id)}
            />
          ))}
        </View>
      </Field>

      <Field label="Address">
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="123 Main St, Apt 4"
          placeholderTextColor={colors.text + "80"}
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
        />
      </Field>

      <Field label="Cleaner">
        <View style={styles.chipsWrap}>
          {professionals.map((p) => (
            <Chip
              key={p.id}
              label={p.name}
              hint={`★ ${p.rating.toFixed(1)}`}
              selected={p.id === cleanerId}
              onPress={() => setCleanerId(p.id)}
            />
          ))}
        </View>
      </Field>

      <Field label="Reviewer">
        <View style={styles.chipsWrap}>
          {reviewers.map((r) => (
            <Chip
              key={r.id}
              label={r.name}
              hint={`★ ${r.rating.toFixed(1)}`}
              selected={r.id === reviewerId}
              onPress={() => setReviewerId(r.id)}
            />
          ))}
        </View>
      </Field>

      <Field label="Notes (optional)">
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Gate code, parking, pets, etc."
          placeholderTextColor={colors.text + "80"}
          multiline
          numberOfLines={3}
          style={[
            styles.input,
            styles.multiline,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
        />
      </Field>

      <View
        style={[
          styles.summary,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.text }]}>
            {service.name}
          </Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            ${service.price}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.text }]}>
            Estimated duration
          </Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {service.durationHours}h
          </Text>
        </View>
        <View
          style={[
            styles.summaryRow,
            styles.summaryTotal,
            { borderTopColor: colors.border },
          ]}
        >
          <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
          <Text style={[styles.totalValue, { color: BRAND }]}>
            ${service.price}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={handleConfirm}
        style={({ pressed }) => [
          styles.confirm,
          { backgroundColor: BRAND, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={styles.confirmText}>Confirm Booking</Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      {children}
    </View>
  );
}

function Chip({
  label,
  hint,
  selected,
  onPress,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? BRAND : colors.card,
          borderColor: selected ? BRAND : colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.chipLabel,
          { color: selected ? "white" : colors.text },
        ]}
      >
        {label}
      </Text>
      {hint && (
        <Text
          style={[
            styles.chipHint,
            { color: selected ? "rgba(255,255,255,0.85)" : colors.text },
          ]}
        >
          {hint}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 18 },
  proBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  proBannerText: { fontSize: 14, color: "#0B5557" },
  field: { gap: 8 },
  fieldLabel: { fontSize: 14, fontWeight: "600" },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipLabel: { fontSize: 14, fontWeight: "600" },
  chipHint: { fontSize: 11, marginTop: 2, opacity: 0.85 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  summary: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontSize: 14, opacity: 0.8 },
  summaryValue: { fontSize: 14, fontWeight: "600" },
  summaryTotal: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  totalLabel: { fontSize: 16, fontWeight: "600" },
  totalValue: { fontSize: 18, fontWeight: "700" },
  confirm: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  confirmText: { color: "white", fontSize: 16, fontWeight: "700" },
});
```

- [ ] **D.2 — Type-check**

```bash
bunx tsc --noEmit
```

Expected: zero errors.

- [ ] **D.3 — Commit & push**

```bash
git add src/app/book.tsx
git commit -m "$(cat <<'EOF'
Wire book flow to jobs store with cleaner and reviewer pickers

Confirm now creates a real Job via useJobsStore.bookJob and navigates to the
Jobs tab. Date and time chips resolve to a real ISO timestamp. Booking is
gated behind the booker identity.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push
```

---

## Task E — Profile identity switcher (Phase 1, parallel)

**Owner:** Lead (after B).

**Goal:** Replace the static "John Smith" header with a card showing the active identity, plus a switcher for choosing among the three demo identities. Add a "Reset demo data" action.

**Depends on:** Task A pushed.

**Files:**
- Modify: `src/app/(tabs)/profile.tsx` (full rewrite)

- [ ] **E.1 — Replace `src/app/(tabs)/profile.tsx`** with the version below

```tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@react-navigation/native";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProAvatar } from "@/components/pro-avatar";
import { BRAND } from "@/constants/colors";
import { identities, type Role } from "@/data/identities";
import { useActiveIdentity, useIdentityStore } from "@/store/identity";
import { useJobsStore } from "@/store/jobs";

const ROLE_LABEL: Record<Role, string> = {
  booker: "Booker",
  cleaner: "Cleaner",
  reviewer: "Reviewer",
};

export default function ProfileRoute() {
  const { colors } = useTheme();
  const identity = useActiveIdentity();
  const setActive = useIdentityStore((s) => s.setActiveIdentity);
  const reset = useJobsStore((s) => s.resetDemo);

  function confirmReset() {
    const ok = () => reset();
    if (Platform.OS === "web") {
      if (window.confirm("Reset demo data?")) ok();
    } else {
      Alert.alert("Reset demo data?", "All current jobs will be replaced with the seed data.", [
        { text: "Keep", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: ok },
      ]);
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top"]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ProAvatar name={identity.name} color={identity.avatarColor} size={88} />
          <Text style={[styles.name, { color: colors.text }]}>
            {identity.name}
          </Text>
          <Text style={[styles.email, { color: colors.text }]}>
            {identity.email}
          </Text>
          <View style={[styles.rolePill, { borderColor: BRAND }]}>
            <Text style={[styles.roleText, { color: BRAND }]}>
              {ROLE_LABEL[identity.role]}
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Demo identity
        </Text>
        <View style={styles.identityList}>
          {identities.map((i) => {
            const active = i.id === identity.id;
            return (
              <Pressable
                key={i.id}
                onPress={() => setActive(i.id)}
                style={({ pressed }) => [
                  styles.identityCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: active ? BRAND : colors.border,
                    borderWidth: active ? 2 : StyleSheet.hairlineWidth,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <ProAvatar name={i.name} color={i.avatarColor} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.identityName, { color: colors.text }]}>
                    {i.name}
                  </Text>
                  <Text style={[styles.identityRole, { color: colors.text }]}>
                    {ROLE_LABEL[i.role]} · {i.email}
                  </Text>
                </View>
                {active && (
                  <Ionicons name="checkmark-circle" size={22} color={BRAND} />
                )}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={confirmReset}
          style={({ pressed }) => [
            styles.reset,
            { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="refresh-outline" size={18} color={colors.text} />
          <Text style={[styles.resetText, { color: colors.text }]}>
            Reset demo data
          </Text>
        </Pressable>

        <Text style={[styles.version, { color: colors.text }]}>
          CleaningOrg · v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  header: { alignItems: "center", gap: 6, paddingVertical: 16 },
  name: { fontSize: 22, fontWeight: "700", marginTop: 8 },
  email: { fontSize: 14, opacity: 0.7 },
  rolePill: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  roleText: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    opacity: 0.6,
    letterSpacing: 0.5,
  },
  identityList: { gap: 10 },
  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
  },
  identityName: { fontSize: 15, fontWeight: "600" },
  identityRole: { fontSize: 12, opacity: 0.7, marginTop: 2 },
  reset: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  resetText: { fontSize: 15, fontWeight: "600" },
  version: { fontSize: 12, opacity: 0.5, textAlign: "center", marginTop: 8 },
});
```

- [ ] **E.2 — Type-check**

```bash
bunx tsc --noEmit
```

Expected: zero errors.

- [ ] **E.3 — Commit & push**

```bash
git add src/app/(tabs)/profile.tsx
git commit -m "$(cat <<'EOF'
Add identity switcher and demo reset on Profile screen

Profile now shows the active demo identity, lets the user pick from the three
seeded roles, and exposes a Reset demo data action that re-seeds the jobs
store.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push
```

---

## Task F — Manual end-to-end + polish (Phase 2)

**Owner:** Lead drives; teammates participate.

**Goal:** Full E2E manual run on iOS simulator, fix bugs found, ship polish.

**Depends on:** Tasks B, C, D, E all merged.

- [ ] **F.1 — Pull and start the app**

```bash
git pull
bunx expo start
# Press i to launch iOS simulator
```

- [ ] **F.2 — Run the test script**

Follow the spec's §Testing strategy. Concretely:

1. Profile → confirm active identity is **John Smith (booker)**.
2. Home → "Book a cleaning" → fill form including a Cleaner (Maria Santos) and Reviewer (Tom Williams) → Confirm. You land on `My Bookings` and see the new job at the top with status "Ready to clean".
3. Profile → switch to **Maria Santos (cleaner)**. Tabs change to `My Jobs / History / Profile`. Open the new job → "Start cleaning". Status pill becomes "Cleaning".
4. Tap "Mark ready for review". Status becomes "Ready for review". Job leaves Cleaner's My Jobs (or stays — both valid; cleaner can still see ready-for-review jobs).
5. Profile → switch to a Reviewer that matches the job's reviewer (likely **Priya Sharma** if you used the seed reviewer; if you assigned **Tom Williams**, the demo identity for reviewer is Priya so the new job will not appear — switch to a job assigned to Priya, e.g. seeded `j2`).
6. Open `j2` → "Start review" → "Decline" → enter "missed bathroom corners" → submit. Confirm the job returns to Cleaner's My Jobs as "Ready to clean" with a decline banner.
7. Switch back to Cleaner → re-clean → ready for review → reviewer → "Approve". Job lands in the cleaner and reviewer History tabs; gone from booker's My Bookings.
8. Reload (`r` in the Expo CLI). Confirm everything persists.
9. Profile → "Reset demo data" → confirm. State returns to seeds.

- [ ] **F.3 — Fix bugs**

For every failure: write a short note (file, line, repro), make a focused fix, type-check, commit. Use commit message prefix `Fix:` per issue.

- [ ] **F.4 — Polish pass**

Quick wins (each ~5 min):
- Empty-state copy on Jobs/History tabs (e.g. cleaner: "No jobs assigned to you yet.").
- Status pill positioning consistent with brand spacing (16px gutter).
- Decline banner copy: ensure full reason renders if long.
- Confirm tab labels render correctly when switching identities (re-render sanity).

- [ ] **F.5 — Push**

```bash
git push
```

---

## Task G — Stretch: room checklist UI + optional photo (Phase 3)

**Owner:** Lead.

**Goal:** Render the per-job checklist on the detail screen during the `cleaning` state, with toggles. Disable "Mark ready for review" until all items are checked. Add an optional photo upload via `expo-image-picker`.

**Depends on:** Task F.

**Files:**
- Modify: `src/app/jobs/[id].tsx`
- Install: `expo-image-picker`

- [ ] **G.1 — Install image picker**

```bash
bunx expo add expo-image-picker
```

- [ ] **G.2 — Extend job detail with checklist + photo**

First, add these two imports at the top of `src/app/jobs/[id].tsx` alongside the existing imports:

```tsx
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import type { Job } from "@/data/jobs";
```

Then find the cleaner section block:

```tsx
{isAssignedCleaner && job.status === "cleaning" && (
  <Pressable
    onPress={() => actions.finishCleaning(job.id)}
    ...
  >
    <Text style={styles.btnPrimaryText}>Mark ready for review</Text>
  </Pressable>
)}
```

Replace it with a block that renders the checklist and photo first, then a disabled-until-complete button:

```tsx
{isAssignedCleaner && job.status === "cleaning" && (
  <View style={{ gap: 14 }}>
    <View
      style={[
        styles.summary,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.formLabel, { color: colors.text }]}>Checklist</Text>
      {(job.checklist ?? []).map((c) => (
        <Pressable
          key={c.room}
          onPress={() => actions.toggleChecklist(job.id, c.room)}
          style={styles.row}
        >
          <Ionicons
            name={c.done ? "checkbox" : "square-outline"}
            size={22}
            color={c.done ? BRAND : colors.text}
          />
          <Text
            style={[
              styles.rowText,
              { color: colors.text, opacity: c.done ? 0.6 : 1 },
            ]}
          >
            {c.room}
          </Text>
        </Pressable>
      ))}
    </View>
    <PhotoBlock job={job} actions={actions} colors={colors} />
    <Pressable
      onPress={() => actions.finishCleaning(job.id)}
      disabled={!(job.checklist ?? []).every((c) => c.done)}
      style={({ pressed }) => [
        styles.btnPrimary,
        {
          opacity: !(job.checklist ?? []).every((c) => c.done)
            ? 0.4
            : pressed
              ? 0.85
              : 1,
        },
      ]}
    >
      <Text style={styles.btnPrimaryText}>Mark ready for review</Text>
    </Pressable>
  </View>
)}
```

Add the `PhotoBlock` component below `Row` near the bottom of the file (do NOT re-import — imports already added above):

```tsx
function PhotoBlock({
  job,
  actions,
  colors,
}: {
  job: Job;
  actions: ReturnType<typeof useJobsStore.getState>;
  colors: { card: string; border: string; text: string };
}) {
  async function pick() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) {
      actions.setPhoto(job.id, result.assets[0].uri);
    }
  }

  return (
    <View
      style={[
        styles.summary,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.formLabel, { color: colors.text }]}>
        Photo (optional)
      </Text>
      {job.photoUri ? (
        <Image
          source={{ uri: job.photoUri }}
          style={{ width: "100%", height: 180, borderRadius: 10 }}
          contentFit="cover"
        />
      ) : null}
      <Pressable
        onPress={pick}
        style={({ pressed }) => [
          styles.btnSecondary,
          { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={[styles.btnSecondaryText, { color: colors.text }]}>
          {job.photoUri ? "Replace photo" : "Add photo"}
        </Text>
      </Pressable>
    </View>
  );
}
```

Then in the reviewer-`reviewing` block (the "Approve / Decline" view), add a checklist + photo display BEFORE the buttons so the reviewer sees the cleaner's work:

```tsx
{isAssignedReviewer && job.status === "reviewing" && (
  <View
    style={[
      styles.summary,
      { backgroundColor: colors.card, borderColor: colors.border },
    ]}
  >
    <Text style={[styles.formLabel, { color: colors.text }]}>Cleaner's checklist</Text>
    {(job.checklist ?? []).map((c) => (
      <View key={c.room} style={styles.row}>
        <Ionicons
          name={c.done ? "checkmark-circle" : "ellipse-outline"}
          size={18}
          color={c.done ? BRAND : colors.text}
        />
        <Text style={[styles.rowText, { color: colors.text }]}>{c.room}</Text>
      </View>
    ))}
    {job.photoUri && (
      <Image
        source={{ uri: job.photoUri }}
        style={{ width: "100%", height: 180, borderRadius: 10, marginTop: 8 }}
        contentFit="cover"
      />
    )}
  </View>
)}
```

- [ ] **G.3 — Type-check + manual test**

```bash
bunx tsc --noEmit
```

In the simulator: as Cleaner, open a `cleaning` job. Confirm checklist appears, toggles work, photo picker opens, "Mark ready for review" stays disabled until all rooms ticked. As Reviewer, confirm the checklist + photo show.

- [ ] **G.4 — Commit & push**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Add cleaner checklist toggles and optional photo to job detail

Renders the per-job checklist during the cleaning state and disables
'Mark ready for review' until all rooms are ticked. Adds an optional photo
upload via expo-image-picker; reviewer sees both during review.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push
```

---

## Task H — Stretch: state-change toasts (Phase 3, parallel with G)

**Owner:** Teammate 1.

**Goal:** When a job's status changes and the active identity is a stakeholder on that job (booker / cleaner / reviewer), show a top-anchored toast.

**Depends on:** Task F.

**Files:**
- Create: `src/components/toast.tsx`
- Create: `src/store/toasts.ts`
- Modify: `src/app/_layout.tsx` (mount the toast container)

- [ ] **H.1 — Create the toast store**

```ts
// src/store/toasts.ts
import { create } from "zustand";

export interface Toast {
  id: string;
  message: string;
}

interface ToastsState {
  toasts: Toast[];
  push: (message: string) => void;
  dismiss: (id: string) => void;
}

export const useToastsStore = create<ToastsState>((set, get) => ({
  toasts: [],
  push: (message) => {
    const id = `t${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({ toasts: [...s.toasts, { id, message }] }));
    setTimeout(() => get().dismiss(id), 3500);
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
```

- [ ] **H.2 — Create the toast component**

```tsx
// src/components/toast.tsx
import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { BRAND } from "@/constants/colors";
import { useIdentityStore } from "@/store/identity";
import { useJobsStore } from "@/store/jobs";
import { useToastsStore } from "@/store/toasts";

export function ToastContainer() {
  const toasts = useToastsStore((s) => s.toasts);
  const dismiss = useToastsStore((s) => s.dismiss);
  const push = useToastsStore((s) => s.push);

  const prevStatuses = useRef<Record<string, string>>({});

  useEffect(() => {
    // Initialise prev snapshot from current store state (no toast on mount).
    const initial = useJobsStore.getState().jobs;
    prevStatuses.current = Object.fromEntries(
      initial.map((j) => [j.id, j.status])
    );

    const unsub = useJobsStore.subscribe((state) => {
      const activeId = useIdentityStore.getState().activeIdentityId;
      for (const job of state.jobs) {
        const prev = prevStatuses.current[job.id];
        if (prev === undefined) {
          // newly created job
          prevStatuses.current[job.id] = job.status;
          continue;
        }
        if (prev !== job.status) {
          prevStatuses.current[job.id] = job.status;
          const isStakeholder =
            job.bookerId === activeId ||
            job.cleanerId === activeId ||
            job.reviewerId === activeId;
          if (isStakeholder) {
            push(messageFor(job.serviceName, job.status, job.declineReason));
          }
        }
      }
    });
    return unsub;
  }, [push]);

  return (
    <View pointerEvents="box-none" style={styles.container}>
      {toasts.map((t) => (
        <Pressable
          key={t.id}
          onPress={() => dismiss(t.id)}
          style={({ pressed }) => [
            styles.toast,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.toastText} numberOfLines={3}>
            {t.message}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function messageFor(
  serviceName: string,
  status: string,
  declineReason?: string
): string {
  switch (status) {
    case "cleaning":
      return `${serviceName} is being cleaned now.`;
    case "ready-for-review":
      return `${serviceName} is ready for review.`;
    case "reviewing":
      return `Reviewer is checking ${serviceName}.`;
    case "done":
      return `${serviceName} is done — approved.`;
    case "ready-to-clean":
      return declineReason
        ? `Reviewer declined: ${declineReason}`
        : `${serviceName} is ready to clean.`;
    case "cancelled":
      return `${serviceName} was cancelled.`;
    default:
      return `${serviceName} status: ${status}`;
  }
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    gap: 8,
    zIndex: 1000,
  },
  toast: {
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  toastText: { color: "white", fontSize: 14, fontWeight: "600" },
});
```

- [ ] **H.3 — Mount in the root layout**

Edit `src/app/_layout.tsx` so the layout includes the toast container after the `<Stack>`:

```tsx
import { ThemeProvider } from "@/components/theme-provider";
import { ToastContainer } from "@/components/toast";
import { Stack } from "expo-router";
import { View } from "react-native";

export default function Layout() {
  return (
    <ThemeProvider>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="book"
            options={{
              presentation: "modal",
              headerShown: true,
              title: "Book a Cleaning",
            }}
          />
          <Stack.Screen
            name="pros/[id]"
            options={{ headerShown: true, title: "" }}
          />
          <Stack.Screen
            name="jobs/[id]"
            options={{ headerShown: true, title: "Job Details" }}
          />
        </Stack>
        <ToastContainer />
      </View>
    </ThemeProvider>
  );
}
```

- [ ] **H.4 — Type-check + manual test**

```bash
bunx tsc --noEmit
```

In the simulator: as Cleaner, transition a job → confirm a toast appears at top. Switch to Reviewer; transition the job → another toast. Booker stakeholder transitions also fire toasts.

- [ ] **H.5 — Commit & push**

```bash
git add src/components/toast.tsx src/store/toasts.ts src/app/_layout.tsx
git commit -m "$(cat <<'EOF'
Add state-change toasts for job stakeholders

Subscribes to the jobs store and fires a top-anchored toast when a job's
status changes and the active identity is the booker, cleaner, or reviewer
on that job.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push
```

---

## Self-review (run before handing out)

- ✅ All actions referenced in tasks are defined in `src/store/jobs.ts` (A.6).
- ✅ `useJob`, `useActiveIdentity`, role-filtered selector hooks all exported from A.
- ✅ `Job` and `JobStatus` types match across all consumer tasks (B job-card, C detail, D book flow).
- ✅ `JobCard` is the only card component used post-A; `BookingCard` deleted in B.
- ✅ Route names locked: `/(tabs)/jobs`, `/(tabs)/history`, `/jobs/[id]`, `/book`.
- ✅ Identity ids referenced in seed data (`booker-1`, `1`, `r1`) are consistent with `identities.ts`, `professionals.ts`, `reviewers.ts`.
- ✅ Decline reason is required (non-empty trim check in C, button disabled when empty).
- ✅ Cancellation only allowed in `ready-to-clean` and only by the booker (validated in store and UI).
- ✅ Stretch G builds on data already produced by A (`SERVICE_ROOMS`, `toggleChecklist`, `setPhoto`).
- ✅ Stretch H uses `useJobsStore.subscribe` + previous-status snapshot to avoid over-firing.
- ✅ No placeholders / TBDs in any task.
