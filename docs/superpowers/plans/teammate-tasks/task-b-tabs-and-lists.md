# Task B — Tabs & lists

**Owner:** Lead
**Time estimate:** ~45 min
**Phase:** 1 (parallel with C, D, E)

## Read first (5 min)

- The §Goal, §Actors, §Routing sections of [`../../specs/2026-05-01-end-to-end-booking-design.md`](../../specs/2026-05-01-end-to-end-booking-design.md)
- The "Background" and "What's already on main" sections of [`_README.md`](_README.md)

## Goal

Make the tab bar role-aware. Migrate the Bookings screen to a role-filtered Jobs screen, add a History tab for cleaner/reviewer, replace `BookingCard` with a `JobCard`, and delete the old `bookings.ts`.

Tab visibility per active identity:

| Role | Tab 1 | Tab 2 | Tab 3 |
|------|-------|-------|-------|
| Booker | Home | My Bookings | Profile |
| Cleaner | My Jobs | History | Profile |
| Reviewer | To Review | History | Profile |

## Locked from other tasks

- Route names: `/(tabs)/jobs`, `/(tabs)/history`. Don't change them — Tasks C and D depend on them.
- Identity hook: import `useActiveIdentity` from `@/store/identity`.

## Files

- **Modify:** `src/app/(tabs)/_layout.tsx` (role-aware tabs)
- **Create:** `src/app/(tabs)/jobs.tsx` (role-filtered list — replaces `bookings.tsx`)
- **Create:** `src/app/(tabs)/history.tsx` (cleaner/reviewer history)
- **Create:** `src/components/job-card.tsx` (replaces `booking-card.tsx`)
- **Delete:** `src/app/(tabs)/bookings.tsx`
- **Delete:** `src/components/booking-card.tsx`
- **Delete:** `src/data/bookings.ts`

## Step 1 — Create `src/components/job-card.tsx`

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

## Step 2 — Create `src/app/(tabs)/jobs.tsx`

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

## Step 3 — Create `src/app/(tabs)/history.tsx`

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

## Step 4 — Replace `src/app/(tabs)/_layout.tsx`

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

## Step 5 — Verify nothing else still imports the old modules

```bash
grep -rn "@/data/bookings\|@/components/booking-card" src/
```

Expected output: only `src/app/(tabs)/bookings.tsx` and `src/components/booking-card.tsx` (the files about to be deleted). If anything else appears, update it to import from `@/data/jobs` and `@/components/job-card` respectively.

## Step 6 — Delete old files

```bash
rm src/app/\(tabs\)/bookings.tsx src/components/booking-card.tsx src/data/bookings.ts
```

## Step 7 — Type-check

```bash
bunx tsc --noEmit
```

Expected: zero errors.

## Step 8 — Commit & push

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
