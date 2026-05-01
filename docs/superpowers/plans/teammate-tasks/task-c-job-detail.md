# Task C — Job detail screen + state transitions

**Owner:** Teammate 1
**Time estimate:** ~45 min
**Phase:** 1 (parallel with B, D, E — all run at the same time)

## Read first (5 min)

- The §Goal, §Actors, §Job state machine sections of [`../../specs/2026-05-01-end-to-end-booking-design.md`](../../specs/2026-05-01-end-to-end-booking-design.md)
- The "Background" and "What's already on main" sections of [`_README.md`](_README.md)

## Goal

Build the shared job-detail screen at `src/app/jobs/[id].tsx` with a role-conditional action panel. All state transitions for booker, cleaner, and reviewer flow through this screen.

The state machine you're wiring:
```
ready-to-clean → cleaning → ready-for-review → reviewing → done
     ↑                                              │
     └──────────────── (decline) ───────────────────┘
```

- Booker can `cancel` only from `ready-to-clean` (terminal `cancelled`).
- Cleaner does `startCleaning` (`ready-to-clean` → `cleaning`) and `finishCleaning` (`cleaning` → `ready-for-review`).
- Reviewer does `startReview` (`ready-for-review` → `reviewing`), `approve` (→ `done`), or `decline` with required reason (→ `ready-to-clean`).

## Locked from other tasks

- Tabs route: navigation here typically arrives via `router.push("/jobs/${id}")` from Task B's `JobCard`.
- The store actions are already in `src/store/jobs.ts`. Your code only consumes them.

## Files

- **Modify:** `src/app/_layout.tsx` (add `Stack.Screen` for `jobs/[id]`)
- **Create:** `src/app/jobs/[id].tsx`

## Step 1 — Add `Stack.Screen` for `jobs/[id]` in `src/app/_layout.tsx`

Read the current file first. Replace the `<Stack>` block so it reads:

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

## Step 2 — Create `src/app/jobs/[id].tsx`

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

## Step 3 — Type-check

```bash
bunx tsc --noEmit
```

Expected: zero errors. If it complains about `Job` type or store imports, you forgot to `git pull` after Task A landed — pull and retry.

## Step 4 — Manual smoke test (optional but recommended)

1. `bunx expo start` and open in iOS simulator (`i`).
2. Switch profile to **Maria Santos (cleaner)** — once Task E lands; otherwise use the default identity which is John Smith.
3. From the Bookings/Jobs tab tap a job that's in the right state.
4. The detail screen renders. Action buttons show only when the active identity matches the job's assigned actor.

If Task E hasn't landed yet, you can verify by manually editing `useIdentityStore.getState().setActiveIdentity("1")` in a temporary `useEffect` in the screen — but easier to just wait for E to land.

## Step 5 — Commit & push

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

## When you're done

Ping the lead. Phase 2 (manual end-to-end test) starts once B+C+D+E are all in.
