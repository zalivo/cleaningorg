import { useTheme } from "@react-navigation/native";
import { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { BRAND } from "@/constants/colors";
import type { Job } from "@/data/jobs";
import { STATUS_COLORS } from "@/lib/job-status-colors";

const DAYS = 7;

interface WeekViewProps {
  jobs: Job[];
  onPressJob: (id: string) => void;
}

interface DayColumn {
  date: Date;
  jobs: Job[];
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * 7-day agenda for cleaners. Today + the next 6 days, each rendered as a
 * column of stacked blocks tinted by status. Empty days render a `—`.
 *
 * The whole view is wrapped in a vertical ScrollView so a single very
 * busy day (12+ blocks) scrolls smoothly without breaking the row
 * layout. Columns flex equally so 7 fit on a phone width — the trade-off
 * is that block titles can be tight; tapping any block hands off to the
 * full job detail screen.
 */
export function WeekView({ jobs, onPressJob }: WeekViewProps) {
  const { colors } = useTheme();

  const columns = useMemo<DayColumn[]>(() => {
    const today = startOfDay(new Date());
    const days: DayColumn[] = Array.from({ length: DAYS }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      return { date, jobs: [] };
    });
    for (const job of jobs) {
      const start = new Date(job.scheduledStart);
      const slot = days.find((d) => sameDay(d.date, start));
      if (slot) slot.jobs.push(job);
    }
    for (const d of days) {
      d.jobs.sort(
        (a, b) =>
          new Date(a.scheduledStart).getTime() -
          new Date(b.scheduledStart).getTime()
      );
    }
    return days;
  }, [jobs]);

  const todayKey = startOfDay(new Date()).getTime();

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator
    >
      <View style={styles.row}>
        {columns.map((col) => {
          const isToday = startOfDay(col.date).getTime() === todayKey;
          return (
            <View key={col.date.toISOString()} style={styles.column}>
              <Text
                style={[
                  styles.weekday,
                  { color: isToday ? BRAND : colors.text },
                ]}
              >
                {col.date.toLocaleDateString(undefined, { weekday: "short" })}
              </Text>
              <Text
                style={[
                  styles.day,
                  { color: isToday ? BRAND : colors.text },
                ]}
              >
                {col.date.getDate()}
              </Text>
              {col.jobs.length === 0 ? (
                <Text style={[styles.empty, { color: colors.text }]}>—</Text>
              ) : (
                col.jobs.map((job) => (
                  <Block
                    key={job.id}
                    job={job}
                    onPress={() => onPressJob(job.id)}
                  />
                ))
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function Block({ job, onPress }: { job: Job; onPress: () => void }) {
  const palette = STATUS_COLORS[job.status];
  const start = new Date(job.scheduledStart);
  const time = start.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.block,
        {
          backgroundColor: palette.bg,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text
        style={[styles.blockTime, { color: palette.fg }]}
        numberOfLines={1}
      >
        {time}
      </Text>
      <Text
        style={[styles.blockTitle, { color: palette.fg }]}
        numberOfLines={2}
      >
        {job.propertyName}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: 4, paddingBottom: 40 },
  row: { flexDirection: "row", alignItems: "stretch" },
  column: { flex: 1, paddingHorizontal: 2, gap: 4, alignItems: "stretch" },
  weekday: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    textAlign: "center",
    opacity: 0.7,
    letterSpacing: 0.3,
  },
  day: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  empty: {
    fontSize: 16,
    opacity: 0.3,
    textAlign: "center",
    paddingVertical: 8,
  },
  block: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  blockTime: { fontSize: 11, fontWeight: "700" },
  blockTitle: { fontSize: 11, fontWeight: "500", marginTop: 2 },
});
