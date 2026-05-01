import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BRAND } from "@/constants/colors";
import type { Job, JobStatus } from "@/data/jobs";
import { useIdentityStore } from "@/store/identity";
import { useJobsStore } from "@/store/jobs";
import { useToastsStore } from "@/store/toasts";

// Approximate height of the collapsed DemoIdentityDock pill (avatar +
// name/role text + vertical padding). Toasts anchor below it so they
// don't overlap the always-visible identity header.
const DOCK_OFFSET = 70;

export function ToastContainer() {
  const insets = useSafeAreaInsets();
  const toasts = useToastsStore((s) => s.toasts);
  const dismiss = useToastsStore((s) => s.dismiss);
  const push = useToastsStore((s) => s.push);

  const prevStatuses = useRef<Record<string, JobStatus>>({});

  useEffect(() => {
    // Seed from current state so we don't toast on mount.
    prevStatuses.current = Object.fromEntries(
      useJobsStore.getState().jobs.map((j) => [j.id, j.status])
    );

    const unsub = useJobsStore.subscribe((state) => {
      const activeId = useIdentityStore.getState().activeIdentityId;
      const next: Record<string, JobStatus> = {};
      for (const job of state.jobs) {
        next[job.id] = job.status;
        const prev = prevStatuses.current[job.id];
        if (prev === undefined) {
          // Newly created job — toast the booker if they aren't the one who created it from this device.
          if (activeId === job.bookerId) {
            // skip — booker just confirmed booking; the navigation already gives feedback
          }
          continue;
        }
        if (prev !== job.status) {
          const isStakeholder =
            job.bookerId === activeId ||
            job.cleanerId === activeId ||
            job.reviewerId === activeId;
          if (isStakeholder) {
            push(messageFor(job, activeId));
          }
        }
      }
      prevStatuses.current = next;
    });
    return unsub;
  }, [push]);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { top: insets.top + DOCK_OFFSET }]}
    >
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

function messageFor(job: Job, activeId: string): string {
  const isBooker = job.bookerId === activeId;
  const isCleaner = job.cleanerId === activeId;
  const isReviewer = job.reviewerId === activeId;
  const propertyName = job.propertyName;

  switch (job.status) {
    case "cleaning":
      // Cleaner just started — toast goes to the booker (and reviewer).
      if (isCleaner) return `You started cleaning ${propertyName}.`;
      return `${job.cleanerName} started cleaning ${propertyName}.`;

    case "ready-for-review":
      if (isCleaner) return `${propertyName} is ready for review.`;
      if (isReviewer) return `${propertyName} is ready for your review.`;
      return `${propertyName} is ready for review.`;

    case "reviewing":
      if (isReviewer) return `Reviewing ${propertyName}.`;
      return `${job.reviewerName} is reviewing ${propertyName}.`;

    case "done":
      if (isReviewer) return `You approved ${propertyName}.`;
      if (isBooker) return `${propertyName} was approved.`;
      return `${propertyName} was approved.`;

    case "ready-to-clean":
      // After decline (loop back).
      if (job.declineReason) {
        if (isReviewer) return `Declined: ${job.declineReason}`;
        if (isCleaner) return `Reviewer declined: ${job.declineReason}`;
        return `Reviewer declined ${propertyName}: ${job.declineReason}`;
      }
      return `${propertyName} is ready to clean.`;

    case "cancelled":
      if (isBooker) return `You cancelled ${propertyName}.`;
      return `${propertyName} was cancelled.`;

    default:
      return `${propertyName} status: ${job.status}`;
  }
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    // top is set inline from safe-area inset + dock offset
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
