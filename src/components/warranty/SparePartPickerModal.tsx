import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { X, PackageSearch, AlertTriangle, Plus, Check } from "lucide-react-native";
import { useTheme } from "../../theme";
import { AppButton } from "../AppButton";
import { SparePartCatalogItem } from "../../services/job.service";

interface SparePartPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (parts: SparePartCatalogItem[]) => void;
  parts: SparePartCatalogItem[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  /** Ids already added to the current list — greyed out so the same part isn't added twice. */
  disabledIds: string[];
}

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Reset selection when modal becomes visible
  useEffect(() => {
    if (visible) {
      setSelectedIds([]);
    }
  }, [visible]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    if (!parts) return;
    const selectedParts = parts.filter((p) => selectedIds.includes(p.id));
    onSelect(selectedParts);
    onClose();
  };

  // Group catalog items
  const catalog = parts || [];
  const selectedList = catalog.filter((p) => selectedIds.includes(p.id));
  const unselectedList = catalog.filter((p) => !selectedIds.includes(p.id) && !disabledIds.includes(p.id));
  const alreadyAddedList = catalog.filter((p) => disabledIds.includes(p.id));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: theme.colors.card }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Add Spare Parts</Text>
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
                We couldn't load the spare-parts list. Please try again.
              </Text>
              <AppButton title="Retry" variant="outline" size="sm" onPress={onRetry} style={{ marginTop: 12 }} />
            </View>
          ) : catalog.length === 0 ? (
            <View style={styles.centerState}>
              <PackageSearch size={36} color={theme.colors.textMuted} />
              <Text style={[styles.stateText, { color: theme.colors.textMuted }]}>
                No spare parts configured for this service.
              </Text>
            </View>
          ) : (
            <>
              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                {/* 1. Selected Parts Section */}
                {selectedList.length > 0 && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={[styles.sectionHeader, { color: theme.colors.success }]}>
                      Selected ({selectedList.length})
                    </Text>
                    {selectedList.map((part) => (
                      <Pressable
                        key={part.id}
                        onPress={() => toggleSelect(part.id)}
                        style={[styles.partRow, { borderColor: theme.colors.borderLight }]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.partName, { color: theme.colors.text }]}>{part.partName}</Text>
                          {part.partNumber ? (
                            <Text style={[styles.partMeta, { color: theme.colors.textMuted }]}>{part.partNumber}</Text>
                          ) : null}
                        </View>
                        <Text style={[styles.partPrice, { color: theme.colors.primary, marginRight: 12 }]}>
                          ₹{part.unitPrice.toLocaleString("en-IN")}
                        </Text>
                        <View style={[styles.iconCircle, { backgroundColor: theme.colors.success }]}>
                          <Check size={12} color="#fff" />
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* 2. Unselected / Available Parts Section */}
                {unselectedList.length > 0 && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={[styles.sectionHeader, { color: theme.colors.textMuted }]}>
                      Available Parts
                    </Text>
                    {unselectedList.map((part) => (
                      <Pressable
                        key={part.id}
                        onPress={() => toggleSelect(part.id)}
                        style={[styles.partRow, { borderColor: theme.colors.borderLight }]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.partName, { color: theme.colors.text }]}>{part.partName}</Text>
                          {part.partNumber ? (
                            <Text style={[styles.partMeta, { color: theme.colors.textMuted }]}>{part.partNumber}</Text>
                          ) : null}
                        </View>
                        <Text style={[styles.partPrice, { color: theme.colors.primary, marginRight: 12 }]}>
                          ₹{part.unitPrice.toLocaleString("en-IN")}
                        </Text>
                        <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.primary}15` }]}>
                          <Plus size={12} color={theme.colors.primary} />
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* 3. Already Added Parts Section */}
                {alreadyAddedList.length > 0 && (
                  <View style={{ opacity: 0.5 }}>
                    <Text style={[styles.sectionHeader, { color: theme.colors.textMuted }]}>
                      Already Added
                    </Text>
                    {alreadyAddedList.map((part) => (
                      <View
                        key={part.id}
                        style={[styles.partRow, { borderColor: theme.colors.borderLight }]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.partName, { color: theme.colors.text }]}>{part.partName}</Text>
                          {part.partNumber ? (
                            <Text style={[styles.partMeta, { color: theme.colors.textMuted }]}>{part.partNumber}</Text>
                          ) : null}
                        </View>
                        <Text style={[styles.partPrice, { color: theme.colors.textMuted }]}>
                          ₹{part.unitPrice.toLocaleString("en-IN")}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>

              <AppButton
                title={selectedIds.length > 0 ? `Add Selected (${selectedIds.length})` : "Cancel"}
                variant={selectedIds.length > 0 ? "primary" : "outline"}
                onPress={selectedIds.length > 0 ? handleConfirm : onClose}
                style={{ marginTop: 16 }}
              />
            </>
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
  sectionHeader: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 10, marginBottom: 4 },
  partRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  partName: { fontSize: 13, fontWeight: "700" },
  partMeta: { fontSize: 11, marginTop: 2 },
  partPrice: { fontSize: 13, fontWeight: "800" },
  iconCircle: { width: 22, height: 22, borderRadius: 11, justifyContent: "center", alignItems: "center" },
});

export default SparePartPickerModal;
