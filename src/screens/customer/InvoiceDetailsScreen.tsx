import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Download,
  Share2,
  CheckCircle2,
  Receipt,
  Tag,
  Calendar,
  MapPin,
  CreditCard,
  User,
  Wrench,
  PhoneCall,
  IndianRupee,
  Check,
  Clock,
} from "lucide-react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { useTheme } from "../../theme";
import { useCustomerInvoiceDetails } from "../../hooks/useCustomer";
import { CustomerStackParamList } from "../../types/navigation.types";
import { AppHeader } from "../../components/AppHeader";
import { AppLoader } from "../../components/AppLoader";
import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppAlertModal } from "../../components/AppAlertModal";
import { PaymentSummaryCard } from "../../components/warranty/PaymentSummaryCard";

type NavigationProp = NativeStackNavigationProp<CustomerStackParamList, "InvoiceDetails">;
type RouteProps = RouteProp<CustomerStackParamList, "InvoiceDetails">;

export const InvoiceDetailsScreen = () => {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { invoiceId } = route.params;

  const { data: invoiceData, isLoading } = useCustomerInvoiceDetails(invoiceId);
  const [downloading, setDownloading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error" | "warning">("success");

  const showAlert = (title: string, message: string, type: "success" | "error" | "warning" = "success") => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const generatePDFHtml = (invoice: any, tenant: any) => {
    const serviceCharge = Number(invoice.serviceCharge ?? 0);
    const labourCharge = Number(invoice.labourCharge ?? 0);
    const sparePartsAmount = Number(invoice.sparePartsAmount ?? 0);
    const additionalCharge = Number(invoice.additionalCharge ?? 0);
    const discount = Number(invoice.discount ?? 0);
    const gstPercent = Number(invoice.gstPercent ?? 0);

    const serviceChargeWaived = Boolean(invoice.payment?.serviceChargeWaived);
    const labourChargeWaived = Boolean(invoice.payment?.labourChargeWaived);

    // ── Calculations ──
    const billableServiceCharge = serviceChargeWaived ? 0 : serviceCharge;
    const billableLabourCharge = labourChargeWaived ? 0 : labourCharge;
    const billableSpareParts = sparePartsAmount > 0 ? sparePartsAmount : 0;
    const billableAdditional = additionalCharge > 0 ? additionalCharge : 0;
    const billableDiscount = discount > 0 ? discount : 0;

    const calculatedGst = (gstPercent > 0 && billableServiceCharge > 0)
      ? Math.round((billableServiceCharge * gstPercent) / 100 * 100) / 100
      : 0;

    const calculatedSubtotal = billableServiceCharge + billableLabourCharge + billableSpareParts + billableAdditional - billableDiscount;
    const calculatedTotal = Math.max(0, calculatedSubtotal + calculatedGst);

    const payMethod = invoice.paymentMethod ?? invoice.payment?.method ?? "—";
    const payStatus = invoice.paymentStatus ?? invoice.payment?.status ?? "—";
    const collAt = invoice.collectedAt ?? invoice.payment?.collectedAt;
    const invNum = invoice.invoiceNumber ?? invoice.invoiceNo ?? "—";
    const tktNum = invoice.ticketNumber ?? invoice.ticket?.ticketNumber ?? "—";

    const isPaid = payStatus === "COLLECTED" || payStatus === "PAID" || invoice.payment?.status === "COLLECTED" || invoice.payment?.status === "PAID";

    const chargeableParts = invoice.ticket?.spareParts?.filter((p: any) => p.coverageType === "OUT_OF_WARRANTY") ?? [];
    const warrantyParts = invoice.ticket?.spareParts?.filter((p: any) => p.coverageType === "WARRANTY") ?? [];

    let sparePartsHtml = "";
    if (chargeableParts.length > 0 || warrantyParts.length > 0) {
      sparePartsHtml = `
        <div style="margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          <div style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #3b82f6; letter-spacing: 0.5px; margin-bottom: 12px;">Spare Parts</div>
      `;

      if (chargeableParts.length > 0) {
        sparePartsHtml += `
          <div style="font-size: 11px; font-weight: bold; color: #ef4444; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Chargeable</div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
            <thead>
              <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
                <th style="text-align: left; font-size: 10px; padding: 6px 8px; color: #64748b; text-transform: uppercase; font-weight: 700;">Part Name</th>
                <th style="text-align: center; font-size: 10px; padding: 6px 8px; color: #64748b; text-transform: uppercase; font-weight: 700; width: 60px;">Qty</th>
                <th style="text-align: right; font-size: 10px; padding: 6px 8px; color: #64748b; text-transform: uppercase; font-weight: 700; width: 90px;">Unit Price</th>
                <th style="text-align: right; font-size: 10px; padding: 6px 8px; color: #64748b; text-transform: uppercase; font-weight: 700; width: 90px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${chargeableParts.map((p: any) => {
          const total = p.unitPrice * p.quantity;
          return `
                  <tr style="border-bottom: 1px dashed #e2e8f0;">
                    <td style="font-size: 12px; padding: 8px; font-weight: bold; color: #1e293b;">+ ${p.name}</td>
                    <td style="text-align: center; font-size: 12px; padding: 8px; color: #1e293b;">${p.quantity}</td>
                    <td style="text-align: right; font-size: 12px; padding: 8px; color: #1e293b;">₹${p.unitPrice.toLocaleString('en-IN')}</td>
                    <td style="text-align: right; font-size: 12px; padding: 8px; font-weight: bold; color: #1e293b;">₹${total.toLocaleString('en-IN')}</td>
                  </tr>
                `;
        }).join("")}
            </tbody>
          </table>
        `;
      }

      if (warrantyParts.length > 0) {
        sparePartsHtml += `
          <div style="font-size: 11px; font-weight: bold; color: #10b981; margin-top: 10px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Warranty Covered</div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
            <thead>
              <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
                <th style="text-align: left; font-size: 10px; padding: 6px 8px; color: #64748b; text-transform: uppercase; font-weight: 700;">Part Name</th>
                <th style="text-align: center; font-size: 10px; padding: 6px 8px; color: #64748b; text-transform: uppercase; font-weight: 700; width: 60px;">Qty</th>
                <th style="text-align: right; font-size: 10px; padding: 6px 8px; color: #64748b; text-transform: uppercase; font-weight: 700; width: 90px;">Face Value</th>
                <th style="text-align: right; font-size: 10px; padding: 6px 8px; color: #64748b; text-transform: uppercase; font-weight: 700; width: 90px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${warrantyParts.map((p: any) => {
          const total = p.unitPrice * p.quantity;
          return `
                  <tr style="border-bottom: 1px dashed #e2e8f0;">
                    <td style="font-size: 12px; padding: 8px; font-weight: bold; color: #10b981;">- ${p.name}</td>
                    <td style="text-align: center; font-size: 12px; padding: 8px; color: #1e293b;">${p.quantity}</td>
                    <td style="text-align: right; font-size: 12px; padding: 8px; text-decoration: line-through; color: #94a3b8;">₹${p.unitPrice.toLocaleString('en-IN')}</td>
                    <td style="text-align: right; font-size: 12px; padding: 8px; font-weight: bold; color: #10b981;">FREE</td>
                  </tr>
                `;
        }).join("")}
            </tbody>
          </table>
        `;
      }

      sparePartsHtml += `</div>`;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice #${invNum}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #f8fafc; padding: 30px; color: #1e293b; }
          .invoice-wrap { max-width: 640px; margin: auto; background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 24px rgba(0,0,0,0.07); }
          .top-bar { height: 6px; background: linear-gradient(to right, #3b82f6, #6366f1); }
          .invoice-body { padding: 32px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
          .brand-name { font-size: 22px; font-weight: 900; color: #3b82f6; letter-spacing: 0.5px; }
          .brand-sub { font-size: 11px; color: #94a3b8; font-weight: 600; margin-top: 3px; text-transform: uppercase; }
          .company-sub { font-size: 11px; color: #64748b; margin-top: 4px; }
          .paid-badge { display: flex; align-items: center; gap: 6px; background: ${isPaid ? "#d1fae5" : "#fef3c7"}; color: ${isPaid ? "#065f46" : "#92400e"}; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 800; letter-spacing: 0.5px; }
          .divider { height: 1px; background: #e2e8f0; margin: 20px 0; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .meta-label { font-size: 9px; font-weight: 700; color: #94a3b8; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
          .meta-value { font-size: 14px; font-weight: 700; color: #1e293b; }
          .meta-value-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
          .items-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          .items-table thead { background: #f1f5f9; }
          .items-table th { padding: 10px 12px; font-size: 11px; font-weight: 700; color: #64748b; text-align: left; text-transform: uppercase; letter-spacing: 0.5px; }
          .items-table td { padding: 12px; font-size: 13px; color: #1e293b; border-bottom: 1px solid #f1f5f9; }
          .items-table .td-right { text-align: right; font-weight: 600; }
          .totals-section { background: #f8fafc; border-radius: 10px; padding: 16px; margin-top: 16px; }
          .totals-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 13px; color: #64748b; }
          .totals-row.grand { font-size: 17px; font-weight: 800; color: #3b82f6; border-top: 2px solid #e2e8f0; margin-top: 10px; padding-top: 12px; }
          .payment-box { background: #eff6ff; border-radius: 10px; padding: 14px; margin-top: 16px; display: flex; justify-content: space-between; align-items: center; }
          .payment-label { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
          .payment-val { font-size: 14px; font-weight: 700; color: #1e293b; margin-top: 4px; }
          .footer { text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; line-height: 1.6; }
          .footer strong { color: #3b82f6; }
        </style>
      </head>
      <body>
        <div class="invoice-wrap">
          <div class="top-bar"></div>
          <div class="invoice-body">
            <div class="header">
              <div>
                <div class="brand-name">${tenant?.companyName || "FIELDEAZE"}</div>
                <div class="brand-sub">Reliable On-Demand Services</div>
                ${tenant?.address ? `<div class="company-sub">${tenant.address}${tenant.city ? ", " + tenant.city : ""}${tenant.state ? ", " + tenant.state : ""}</div>` : ""}
                ${tenant?.phone ? `<div class="company-sub">Ph: ${tenant.phone}</div>` : ""}
              </div>
              <div class="paid-badge">${isPaid ? "PAID" : "PENDING"}</div>
            </div>
 
            <div class="divider"></div>
 
            <div class="meta-grid">
              <div>
                <div class="meta-label">Invoice Number</div>
                <div class="meta-value">#${invNum}</div>
              </div>
              <div style="text-align:right;">
                <div class="meta-label">Invoice Date</div>
                <div class="meta-value">${formatDate(invoice.generatedAt)}</div>
              </div>
              <div>
                <div class="meta-label">Ticket Number</div>
                <div class="meta-value">${tktNum}</div>
              </div>
              <div style="text-align:right;">
                <div class="meta-label">Service</div>
                <div class="meta-value">${invoice.ticket?.subCategory?.name || "General Service"}</div>
                <div class="meta-value-sub">${invoice.ticket?.subCategory?.category?.name || ""}</div>
              </div>
              ${invoice.ticket?.technician ? `
              <div>
                <div class="meta-label">Technician</div>
                <div class="meta-value">${invoice.ticket.technician.name}</div>
                <div class="meta-value-sub">Ph: ${invoice.ticket.technician.phone}</div>
              </div>` : ""}
            </div>
 
            <div class="divider"></div>
 
            <table class="items-table">
              <thead>
                <tr>
                  <th>Service Item</th>
                  <th style="text-align:right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${serviceCharge > 0 ? `
                <tr>
                  <td>
                    <strong>${invoice.ticket?.subCategory?.name || "General Service"}${serviceChargeWaived ? " (Covered by AMC)" : ""}</strong><br>
                    <span style="font-size:11px;color:#94a3b8;">${invoice.ticket?.description || invoice.ticket?.subCategory?.category?.name || ""}</span>
                  </td>
                  <td class="td-right">${serviceChargeWaived ? "FREE" : `₹${serviceCharge.toLocaleString("en-IN")}`}</td>
                </tr>
                ` : ""}
                ${labourCharge > 0 ? `
                <tr>
                  <td>
                    <strong>Labour Charge${labourChargeWaived ? " (Covered by AMC)" : ""}</strong>
                  </td>
                  <td class="td-right">${labourChargeWaived ? "FREE" : `₹${labourCharge.toLocaleString("en-IN")}`}</td>
                </tr>
                ` : ""}
                ${billableSpareParts > 0 ? `
                <tr>
                  <td>
                    <strong>Chargeable Spare Parts</strong><br>
                    <span style="font-size:11px;color:#94a3b8;">Parts not covered under warranty</span>
                  </td>
                  <td class="td-right">₹${billableSpareParts.toLocaleString("en-IN")}</td>
                </tr>
                ` : ""}
              </tbody>
            </table>
 
            ${sparePartsHtml}
 
            <div class="totals-section">
              ${billableServiceCharge > 0 ? `<div class="totals-row"><span>Base Service Charge</span><span>₹${billableServiceCharge.toLocaleString("en-IN")}</span></div>` : ""}
              ${billableLabourCharge > 0 ? `<div class="totals-row"><span>Labour Charge</span><span>₹${billableLabourCharge.toLocaleString("en-IN")}</span></div>` : ""}
              ${billableSpareParts > 0 ? `<div class="totals-row"><span>Spare Parts</span><span>₹${billableSpareParts.toLocaleString("en-IN")}</span></div>` : ""}
              ${billableAdditional > 0 ? `<div class="totals-row"><span>Extra Charges</span><span>₹${billableAdditional.toLocaleString("en-IN")}</span></div>` : ""}
              ${billableDiscount > 0 ? `<div class="totals-row"><span>Discount</span><span>-₹${billableDiscount.toLocaleString("en-IN")}</span></div>` : ""}
              ${calculatedGst > 0 ? `<div class="totals-row"><span>GST (${gstPercent}%)</span><span>₹${calculatedGst.toLocaleString("en-IN")}</span></div>` : ""}
              <div class="totals-row grand"><span>Total Amount</span><span>₹${calculatedTotal.toLocaleString("en-IN")}</span></div>
            </div>
 
            <div class="payment-box">
              <div>
                <div class="payment-label">Payment Method</div>
                <div class="payment-val">${payMethod}</div>
              </div>
              <div style="text-align:right;">
                <div class="payment-label">Payment Status</div>
                <div class="payment-val" style="color:${isPaid ? "#059669" : "#d97706"}">${isPaid ? "Collected" : payStatus}</div>
              </div>
              ${collAt ? `
              <div style="text-align:right;">
                <div class="payment-label">Collected At</div>
                <div class="payment-val">${formatDate(collAt)}</div>
              </div>` : ""}
            </div>
 
            <div class="footer">
              Thank you for choosing <strong>${tenant?.companyName || "FieldEaze"}</strong>!<br>
              For queries: ${tenant?.email || "support@fieldeaze.com"}${tenant?.phone ? " | " + tenant.phone : ""}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handleDownload = async () => {
    if (!invoiceData) return;
    try {
      setDownloading(true);
      const html = generatePDFHtml(invoiceData.invoice, invoiceData.tenant);
      const { uri } = await Print.printToFileAsync({ html });
      if (Platform.OS === "ios") {
        await Sharing.shareAsync(uri);
      } else {
        await Print.printAsync({ uri });
      }
      showAlert("Success", `Invoice #${invoiceData.invoice.invoiceNumber} is ready.`, "success");
    } catch (err: any) {
      showAlert("Download Failed", err.message || "Failed to generate invoice PDF.", "error");
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!invoiceData) return;
    try {
      const html = generatePDFHtml(invoiceData.invoice, invoiceData.tenant);
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `Share Invoice #${invoiceData.invoice.invoiceNumber}`,
        UTI: "com.adobe.pdf",
      });
    } catch (err: any) {
      showAlert("Share Failed", err.message || "Failed to share invoice.", "error");
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader showBack onBackPress={() => navigation.goBack()} title="Invoice Details" />
        <AppLoader message="Loading invoice..." />
      </View>
    );
  }

  if (!invoiceData) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader showBack onBackPress={() => navigation.goBack()} title="Invoice Details" />
        <View style={styles.centerContent}>
          <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>Invoice not found.</Text>
        </View>
      </View>
    );
  }

  const { invoice: rawInvoice, tenant } = invoiceData;
  const invoice = rawInvoice as any;

  const baseAmount = Number(
    invoice.baseAmount ??
    invoice.baseCharges ??
    invoice.baseServiceCharge ??
    invoice.subtotal ??
    0
  );

  const extraCharges = Number(
    invoice.extraChargesTotal ??
    invoice.extraCharges ??
    0
  );

  const gstAmount = baseAmount > 0 ? Number(
    invoice.gstAmount ??
    invoice.gst ??
    0
  ) : 0;

  const rawTotal = Number(
    invoice.totalAmount ??
    invoice.grandTotal ??
    invoice.total ??
    (baseAmount + extraCharges + gstAmount)
  );

  const totalAmount = rawTotal;

  const paymentMethod = invoice.paymentMethod ?? invoice.payment?.method ?? "—";
  const paymentStatus = invoice.paymentStatus ?? invoice.payment?.status ?? "—";
  const collectedAt = invoice.collectedAt ?? invoice.payment?.collectedAt;
  const invoiceNumber = invoice.invoiceNumber ?? invoice.invoiceNo ?? "—";
  const ticketNumber = invoice.ticketNumber ?? invoice.ticket?.ticketNumber ?? "—";

  const isPaid = paymentStatus === "COLLECTED" || paymentStatus === "PAID" || invoice.payment?.status === "COLLECTED" || invoice.payment?.status === "PAID";
  const paymentStatusColor = isPaid ? theme.colors.success : theme.colors.warning;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader showBack onBackPress={() => navigation.goBack()} title="Invoice Details" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Single unified payment summary — warrantyPartsValue is never persisted on the
            Invoice/Payment records (only the live technician preview / just-collected response
            have it), so it's correctly omitted here rather than fabricated. */}
        <View style={{ marginBottom: 16 }}>
          <PaymentSummaryCard
            invoiceNumber={invoiceNumber}
            ticketNumber={ticketNumber}
            customerName={invoice.ticket?.customer?.name || invoice.customerName || invoice.ticket?.customerName || "Customer"}
            paymentMode={paymentMethod}
            paymentStatus={paymentStatus}
            invoiceDate={formatDate(invoice.generatedAt)}
            serviceCharge={Number(invoice.serviceCharge ?? 0)}
            serviceChargeWaived={Boolean(invoice.payment?.serviceChargeWaived)}
            labourCharge={Number(invoice.labourCharge ?? 0)}
            labourChargeWaived={Boolean(invoice.payment?.labourChargeWaived)}
            sparePartsAmount={Number(invoice.sparePartsAmount ?? 0)}
            warrantyPartsValue={(invoice as any)?.warrantyPartsValue ?? (invoice as any)?.warrantySavings ?? (invoice.payment as any)?.warrantyPartsValue}
            additionalCharge={Number(invoice.additionalCharge ?? 0)}
            discount={Number(invoice.discount ?? 0)}
            subtotal={Number(invoice.subtotal ?? baseAmount)}
            gstPercent={Number(invoice.gstPercent ?? 0)}
            gstAmount={gstAmount}
            grandTotal={totalAmount}
            spareParts={
              invoice.ticket?.spareParts
                ? invoice.ticket.spareParts.map((p: any) => ({
                  name: p.sparePart?.partName ?? p.name ?? "Spare Part",
                  quantity: Number(p.quantity ?? 1),
                  unitPrice: Number(p.unitPrice ?? 0),
                  coverageType: (p.coverageType ?? p.warrantyStatus ?? "OUT_OF_WARRANTY") as "WARRANTY" | "OUT_OF_WARRANTY",
                }))
                : undefined
            }
          />
        </View>

        {/* Technician Info */}
        {invoice.ticket?.technician && (
          <AppCard style={{ marginTop: 16, backgroundColor: `${theme.colors.primary}08`, borderColor: `${theme.colors.primary}20` }}>
            <View style={styles.techRow}>
              <User size={13} color={theme.colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.techLabel, { color: theme.colors.textMuted }]}>Technician</Text>
              <Text style={[styles.techValue, { color: theme.colors.text }]}>
                {"  "}{invoice.ticket.technician.name}
              </Text>
            </View>
            <View style={[styles.techRow, { marginTop: 4 }]}>
              <PhoneCall size={13} color={theme.colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.techLabel, { color: theme.colors.textMuted }]}>Contact</Text>
              <Text style={[styles.techValue, { color: theme.colors.text }]}>
                {"  "}{invoice.ticket.technician.phone}
              </Text>
            </View>
          </AppCard>
        )}

        {/* Action Buttons */}
        <View style={styles.btnRow}>
          <AppButton
            title={downloading ? "Generating..." : "Download PDF"}
            onPress={handleDownload}
            variant="outline"
            style={{ flex: 1 }}
            loading={downloading}
            icon={<Download size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />}
          />
          <AppButton
            title="Share"
            onPress={handleShare}
            variant="outline"
            style={{ flex: 1 }}
            icon={<Share2 size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />}
          />
        </View>
      </ScrollView>

      <AppAlertModal
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onClose={() => setAlertVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  centerContent: { flex: 1, justifyContent: "center", alignItems: "center" },

  invoiceSheet: {
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  invoiceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  brandName: { fontSize: 20, fontWeight: "900", letterSpacing: 0.5 },
  brandSub: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", marginTop: 2, letterSpacing: 0.5 },
  tenantAddress: { fontSize: 10, marginTop: 3, lineHeight: 14 },
  paidBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  paidText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },

  divider: { height: 1, marginVertical: 14 },

  metaGrid: { flexDirection: "row", justifyContent: "space-between" },
  metaLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 },
  metaValue: { fontSize: 13, fontWeight: "700" },
  metaValueSm: { fontSize: 12, fontWeight: "600" },

  sectionHeading: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },

  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  itemName: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  itemCategory: { fontSize: 12, marginBottom: 3 },
  itemDesc: { fontSize: 11, lineHeight: 15 },
  itemPrice: { fontSize: 15, fontWeight: "700" },

  techBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  techRow: { flexDirection: "row", alignItems: "center" },
  techLabel: { fontSize: 11, fontWeight: "600" },
  techValue: { fontSize: 12, fontWeight: "700" },

  totalsBlock: {
    borderRadius: 12,
    padding: 14,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 13 },
  totalVal: { fontSize: 13, fontWeight: "600" },
  grandTotalLabel: { fontSize: 15, fontWeight: "700" },
  grandTotalVal: { fontSize: 20, fontWeight: "900" },

  paymentGrid: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  methodRow: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 3 },
  statusPillText: { fontSize: 11, fontWeight: "700" },

  btnRow: { flexDirection: "row", gap: 12 },
});

export default InvoiceDetailsScreen;
