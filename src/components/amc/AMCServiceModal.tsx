import React, { useState } from "react";
import { View, Text, StyleSheet, Modal, Pressable } from "react-native";
import { Shield, Wrench } from "lucide-react-native";
import { useTheme } from "../../theme";
import { AppButton } from "../AppButton";

interface AMCServiceModalProps {
  visible: boolean;
  /** Plan name shown for context, e.g. "Gold AMC". */
  planName?: string | null;
  onClose: () => void;
  onConfirm: (isAmcRequest: boolean) => void;
}

/** Asked whenever the customer picks an asset that has active AMC coverage while raising a
 * ticket — lets them choose whether this particular request should be billed under the AMC
 * contract (service + labour waived) or as a normal paid visit. */
export const AMCServiceModal: React.FC<AMCServiceModalProps> = ({ visible, planName, onClose, onConfirm }) => {
  const theme = useTheme();
  const [selection, setSelection] = useState<"AMC" | "NORMAL">("AMC");

  const options: { key: "AMC" | "NORMAL"; title: string; description: string; icon: React.ReactNode }[] = [
    {
      key: "AMC",
      title: "AMC Service",
      description: planName
        ? `Covered under your ${planName} contract — service & labour charges waived.`
        : "Covered under your active AMC contract — service & labour charges waived.",
      icon: <Shield size={20} color={theme.colors.primary} />,
    },
    {
      key: "NORMAL",
      title: "Normal Service",
      description: "Billed as a regular paid visit, outside your AMC contract.",
      icon: <Wrench size={20} color={theme.colors.textMuted} />,
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: theme.colors.card }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Choose Service Type</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            This asset has active AMC coverage. How should this request be billed?
          </Text>

          <View style={{ marginTop: 16, gap: 12 }}>
            {options.map((opt) => {
              const isSelected = selection === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setSelection(opt.key)}
                  style={[
                    styles.option,
                    {
                      borderColor: isSelected ? theme.colors.primary : theme.colors.borderLight,
                      backgroundColor: isSelected ? `${theme.colors.primary}0a` : "transparent",
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.radioOuter,
                      { borderColor: isSelected ? theme.colors.primary : theme.colors.borderLight },
                    ]}
                  >
                    {isSelected ? <View style={[styles.radioInner, { backgroundColor: theme.colors.primary }]} /> : null}
                  </View>
                  {opt.icon}
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.optionTitle, { color: theme.colors.text }]}>{opt.title}</Text>
                    <Text style={[styles.optionDesc, { color: theme.colors.textMuted }]}>{opt.description}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.buttonRow}>
            <AppButton title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} textStyle={{ color: theme.colors.textMuted }} />
            <AppButton
              title="Continue"
              onPress={() => onConfirm(selection === "AMC")}
              style={{ flex: 1 }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.4)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 360, borderRadius: 20, padding: 22 },
  title: { fontSize: 17, fontWeight: "800" },
  subtitle: { fontSize: 12, marginTop: 6, lineHeight: 17 },
  option: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: 12, padding: 12 },
  radioOuter: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: "center", justifyContent: "center", marginRight: 10 },
  radioInner: { width: 9, height: 9, borderRadius: 5 },
  optionTitle: { fontSize: 13, fontWeight: "700" },
  optionDesc: { fontSize: 11, marginTop: 2, lineHeight: 15 },
  buttonRow: { flexDirection: "row", gap: 12, marginTop: 20 },
});

export default AMCServiceModal;
