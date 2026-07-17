import React from "react";
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { X, PackageSearch, AlertTriangle } from "lucide-react-native";
import { useTheme } from "../../theme";
import { AppButton } from "../AppButton";
import { SparePartCatalogItem } from "../../services/job.service";

interface SparePartPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (part: SparePartCatalogItem) => void;
  parts: SparePartCatalogItem[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  /** Ids already added to the current list — greyed out so the same part isn't added twice. */
  disabledIds: string[];
}

/** Catalog picker for adding a spare part. Handles loading/empty/error explicitly since the
 * technician-facing spare-parts listing endpoint may not be available yet (see
 * JobService.getSparePartsForSubCategory) — this must degrade gracefully, never crash. */
export const SparePartPickerModal: React.FC<SparePartPickerModalProps> = ({
  visible,
  onClose,
  onSelect,
  parts,
  isLoading,
  isError,
  onRetry,
  disabledIds,
}) => {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: theme.colors.card }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Add Spare Part</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={theme.colors.textMuted} />
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.stateText, { color: theme.colors.textMuted }]}>Loading spare parts...</Text>
            </View>
          ) : isError ? (
            <View style={styles.centerState}>
              <AlertTriangle size={36} color={theme.colors.danger} />
              <Text style={[styles.stateText, { color: theme.colors.text, fontWeight: "700" }]}>
                Spare parts catalog unavailable
              </Text>
              <Text style={[styles.stateText, { color: theme.colors.textMuted }]}>
                We couldn't load the spare-parts list for this service. Please try again, or contact your
                administrator if this keeps happening.
              </Text>
              <AppButton title="Retry" variant="outline" size="sm" onPress={onRetry} style={{ marginTop: 12 }} />
            </View>
          ) : !parts || parts.length === 0 ? (
            <View style={styles.centerState}>
              <PackageSearch size={36} color={theme.colors.textMuted} />
              <Text style={[styles.stateText, { color: theme.colors.textMuted }]}>
                No spare parts configured for this service yet.
              </Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {parts.map((part) => {
                const disabled = disabledIds.includes(part.id);
                return (
                  <Pressable
                    key={part.id}
                    disabled={disabled}
                    onPress={() => onSelect(part)}
                    style={[
                      styles.partRow,
                      {
                        borderColor: theme.colors.borderLight,
                        opacity: disabled ? 0.5 : 1,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.partName, { color: theme.colors.text }]}>{part.partName}</Text>
                      {part.partNumber ? (
                        <Text style={[styles.partMeta, { color: theme.colors.textMuted }]}>{part.partNumber}</Text>
                      ) : null}
                    </View>
                    <Text style={[styles.partPrice, { color: theme.colors.primary }]}>
                      ₹{part.unitPrice.toLocaleString("en-IN")}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.4)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 380, borderRadius: 20, padding: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 16, fontWeight: "800" },
  centerState: { alignItems: "center", paddingVertical: 28, gap: 8 },
  stateText: { fontSize: 12, textAlign: "center", lineHeight: 17, paddingHorizontal: 8 },
  partRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  partName: { fontSize: 13, fontWeight: "700" },
  partMeta: { fontSize: 11, marginTop: 2 },
  partPrice: { fontSize: 13, fontWeight: "800" },
});

export default SparePartPickerModal;
