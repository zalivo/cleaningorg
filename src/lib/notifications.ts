import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { type Job, formatJobWindow } from "@/data/jobs";
import { useIdentityStore } from "@/store/identity";

// One delayed local-notification per state-machine transition. The delay gives
// the demo presenter time to switch identities on the same device before the
// banner pops; the foreground handler suppresses banners whose `recipientId`
// doesn't match the active identity, so the booker doesn't see "new job"
// notifications meant for the cleaner.

export type NotifKind =
  | "booked"
  | "finished"
  | "approved"
  | "declined"
  | "cancelled";

interface NotifSpec {
  recipientId: (job: Job) => string;
  title: string;
  body: (job: Job) => string;
  delaySeconds: number;
}

// One transition kind can fan out to multiple recipients (e.g. `approved`
// pings both booker and cleaner, staggered, so a presenter can switch twice
// during the demo).
const SPECS: Record<NotifKind, NotifSpec[]> = {
  booked: [
    {
      recipientId: (j) => j.cleanerId,
      title: "New cleaning job",
      body: (j) =>
        `${j.propertyName} — ${formatJobWindow(j.scheduledStart, j.scheduledEnd)}`,
      delaySeconds: 5,
    },
  ],
  finished: [
    {
      recipientId: (j) => j.reviewerId,
      title: "Ready for review",
      body: (j) => `${j.propertyName} — cleaned by ${j.cleanerName}`,
      delaySeconds: 5,
    },
  ],
  approved: [
    {
      recipientId: (j) => j.bookerId,
      title: "Cleaning approved",
      body: (j) => `${j.propertyName} — reviewed by ${j.reviewerName}`,
      delaySeconds: 5,
    },
    {
      recipientId: (j) => j.cleanerId,
      title: "Cleaning approved",
      body: (j) => `${j.propertyName} — reviewed by ${j.reviewerName}`,
      delaySeconds: 8,
    },
  ],
  declined: [
    {
      recipientId: (j) => j.cleanerId,
      title: "Cleaning needs rework",
      body: (j) => {
        const reason = j.declineReason?.trim() || "(no reason given)";
        return `${j.propertyName} — "${reason}"`;
      },
      delaySeconds: 5,
    },
  ],
  cancelled: [
    {
      recipientId: (j) => j.cleanerId,
      title: "Job cancelled",
      body: (j) =>
        `${j.propertyName} — ${formatJobWindow(j.scheduledStart, j.scheduledEnd)}`,
      delaySeconds: 5,
    },
  ],
};

export interface NotificationPayload {
  jobId: string;
  recipientId: string;
}

let handlerInstalled = false;

/**
 * Install the foreground handler exactly once. Web is a no-op — expo-notifications
 * has limited web support and the in-app toast layer already covers feedback there.
 */
export function installNotificationHandler(): void {
  if (Platform.OS === "web" || handlerInstalled) return;
  handlerInstalled = true;
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const payload = readPayload(notification.request.content.data);
      const activeId = useIdentityStore.getState().activeIdentityId;
      const isForActive = payload.recipientId === activeId;
      return {
        shouldShowBanner: isForActive,
        shouldShowList: isForActive,
        shouldPlaySound: isForActive,
        shouldSetBadge: false,
      };
    },
  });
}

/**
 * Best-effort permission prompt. Returns true if granted. We never block the
 * user flow on the result — denied permission just means notifications silently
 * no-op and the toast layer carries the feedback.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
}

/**
 * Schedule one or more delayed local notifications for a state-machine
 * transition. Failures are swallowed (e.g. permission denied, web fallback) —
 * this is a demo-polish layer, never load-bearing.
 */
export function scheduleJobNotification(job: Job, kind: NotifKind): void {
  if (Platform.OS === "web") return;
  for (const spec of SPECS[kind]) {
    const payload: NotificationPayload = {
      jobId: job.id,
      recipientId: spec.recipientId(job),
    };
    Notifications.scheduleNotificationAsync({
      content: {
        title: spec.title,
        body: spec.body(job),
        // Cast: NotificationContentInput.data wants an open index signature;
        // our closed payload shape satisfies it structurally.
        data: payload as unknown as Record<string, unknown>,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: spec.delaySeconds,
      },
    }).catch((err) => {
      console.warn("scheduleJobNotification failed", kind, err);
    });
  }
}

/**
 * Narrow an OS-supplied data payload to our shape, defaulting missing fields
 * to empty strings so callers can compare without null-checks. We can't trust
 * the OS to round-trip the object intact across cold launches.
 */
export function readPayload(data: unknown): NotificationPayload {
  const obj = (data ?? {}) as Partial<NotificationPayload>;
  return {
    jobId: typeof obj.jobId === "string" ? obj.jobId : "",
    recipientId: typeof obj.recipientId === "string" ? obj.recipientId : "",
  };
}
