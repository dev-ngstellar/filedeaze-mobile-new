import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { PlusCircle } from "lucide-react-native";
import { useTheme } from "../../theme";
import { useSparePartsCatalog } from "../../hooks/useJobs";
import { SparePartUsageDraft, SparePartCatalogItem, SparePartCoverageType } from "../../services/job.service";
import { SparePartUsageRow } from "./SparePartUsageRow";
import { SparePartPickerModal } from "./SparePartPickerModal";

interface SparePartsSectionProps {
  subCategoryId: string | undefined;
  items: SparePartUsageDraft[];
  onChange: (items: SparePartUsageDraft[]) => void;
  title?: string;
  subtitle?: string;
  /** localIds whose warranty status is missing — shown after a failed submit attempt. */
  invalidIds?: Set<string>;
}

let localIdSeq = 0;
const nextLocalId = () => `spare-part-${Date.now()}-${localIdSeq++}`;

/** Spare-part usage list with a mandatory per-row warranty selector. Shared by the Complete Job
 * screen (feeds sparePartsUsed) and the Collect Payment screen (feeds warrantyParts/nonWarrantyParts) —
 * the two callers just read `items` back in whatever shape their submit payload needs. */
export const SparePartsSection: React.FC<SparePartsSectionProps> = ({
  subCategoryId,
  items,
  onChange,
  title = "Spare Parts Used",
  subtitle,
  invalidIds,
}) => {
  const theme = useTheme();
  const [pickerVisible, setPickerVisible] = useState(false);

  const {
    data: catalog,
    isLoading: isCatalogLoading,
    isError: isCatalogError,
    refetch: refetchCatalog,
  } = useSparePartsCatalog(subCategoryId, pickerVisible);

  const handleSelectPart = (part: SparePartCatalogItem) => {
    const draft: SparePartUsageDraft = {
      localId: nextLocalId(),
      sparePartId: part.id,
      partName: part.partName,
      unitPrice: part.unitPrice,
      quantity: 1,
      warrantyStatus: null,
    };
    onChange([...items, draft]);
    setPickerVisible(false);
  };

  const updateItem = (localId: string, patch: Partial<SparePartUsageDraft>) => {
    onChange(items.map((it) => (it.localId === localId ? { ...it, ...patch } : it)));
  };

  const removeItem = (localId: string) => {
    onChange(items.filter((it) => it.localId !== localId));
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{subtitle}</Text> : null}
        </View>
        <Pressable
          onPress={() => setPickerVisible(true)}
          style={[styles.addBtn, { backgroundColor: `${theme.colors.primary}12` }]}
        >
          <PlusCircle size={14} color={theme.colors.primary} />
          <Text style={[styles.addBtnText, { color: theme.colors.primary }]}>Add Spare Part</Text>
        </Pressable>
      </View>

      {items.length === 0 ? (
        <View style={[styles.emptyBox, { borderColor: theme.colors.borderLight }]}>
          <Text style={{ fontSize: 12, color: theme.colors.textMuted }}>No spare parts added.</Text>
        </View>
      ) : (
        items.map((item) => (
          <SparePartUsageRow
            key={item.localId}
            item={item}
            onChangeQuantity={(quantity) => updateItem(item.localId, { quantity })}
            onChangeWarranty={(warrantyStatus: SparePartCoverageType) => updateItem(item.localId, { warrantyStatus })}
            onRemove={() => removeItem(item.localId)}
            warrantyError={invalidIds?.has(item.localId)}
          />
        ))
      )}

      <SparePartPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleSelectPart}
        parts={catalog}
        isLoading={isCatalogLoading}
        isError={isCatalogError}
        onRetry={() => refetchCatalog()}
        disabledIds={items.map((it) => it.sparePartId)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 18 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  title: { fontSize: 13, fontWeight: "700" },
  subtitle: { fontSize: 11, marginTop: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  addBtnText: { fontSize: 11, fontWeight: "700" },
  emptyBox: { borderWidth: 1, borderStyle: "dashed", borderRadius: 10, padding: 14, alignItems: "center" },
});

export default SparePartsSection;

/** Validates a list of spare-part drafts, returning a human-readable error message or null.
 * Enforces: warranty status required, quantity > 0, no duplicate spare parts. Exported so both
 * Complete Job and Collect Payment can run the same check before submitting. */
export function validateSparePartDrafts(items: SparePartUsageDraft[]): { message: string; invalidIds: Set<string> } | null {
  const invalidIds = new Set<string>();

  for (const item of items) {
    if (!item.warrantyStatus) invalidIds.add(item.localId);
    if (item.quantity <= 0) invalidIds.add(item.localId);
  }
  if (invalidIds.size > 0) {
    return { message: "Please set quantity and warranty status for every spare part.", invalidIds };
  }

  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.sparePartId)) {
      return { message: `"${item.partName}" has been added more than once — please combine it into a single row.`, invalidIds: new Set(items.filter((i) => i.sparePartId === item.sparePartId).map((i) => i.localId)) };
    }
    seen.add(item.sparePartId);
  }

  return null;
}
