import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@react-navigation/native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProAvatar } from "@/components/pro-avatar";
import { BRAND, BRAND_LIGHT } from "@/constants/colors";
import { identities, type Role } from "@/data/identities";
import { useT } from "@/lib/i18n";
import { useActiveIdentity, useIdentityStore } from "@/store/identity";

/**
 * A persistent demo-only "logged in as" pill, mounted at the root of the
 * app so it overlays every screen (tabs, modal book flow, detail screens).
 * Collapsed: shows the active identity's avatar + role. Tap to expand into
 * a switcher; tap an identity to switch + auto-collapse.
 *
 * Sits above the tab bar and below the toast container, so toasts pop on
 * top during state transitions.
 */
export function DemoIdentityDock() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const identity = useActiveIdentity();
  const setActive = useIdentityStore((s) => s.setActiveIdentity);
  const [open, setOpen] = useState(false);

  const roleLabel: Record<Role, string> = {
    booker: t("profile.roles.booker"),
    cleaner: t("profile.roles.cleaner"),
    reviewer: t("profile.roles.reviewer"),
  };

  function pick(id: string) {
    setActive(id);
    setOpen(false);
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { top: insets.top + 6 }]}
    >
      <View
        style={[
          styles.dock,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Pressable
          onPress={() => setOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={`Demo identity: ${identity.name}, ${roleLabel[identity.role]}. Tap to switch.`}
          style={({ pressed }) => [
            styles.pill,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <ProAvatar
            name={identity.name}
            color={identity.avatarColor}
            size={28}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {identity.name}
            </Text>
            <Text style={[styles.role, { color: BRAND }]} numberOfLines={1}>
              {roleLabel[identity.role]}
            </Text>
          </View>
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.text}
          />
        </Pressable>

        {open && (
          <View style={[styles.list, { borderTopColor: colors.border }]}>
            {identities.map((i) => {
              const active = i.id === identity.id;
              return (
                <Pressable
                  key={i.id}
                  onPress={() => pick(i.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      backgroundColor: active ? BRAND_LIGHT : "transparent",
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <ProAvatar
                    name={i.name}
                    color={i.avatarColor}
                    size={28}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                      {i.name}
                    </Text>
                    <Text
                      style={[
                        styles.role,
                        { color: active ? BRAND : colors.text, opacity: active ? 1 : 0.65 },
                      ]}
                      numberOfLines={1}
                    >
                      {roleLabel[i.role]}
                    </Text>
                  </View>
                  {active && (
                    <Ionicons name="checkmark-circle" size={18} color={BRAND} />
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 12,
    right: 12,
    // top is set inline from safe-area inset
    alignItems: "center",
    // Above the tab bar / app chrome, below the toast container (z=1000).
    zIndex: 900,
    elevation: 18,
  },
  dock: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  name: { fontSize: 14, fontWeight: "600" },
  role: { fontSize: 11, fontWeight: "600" },
});
