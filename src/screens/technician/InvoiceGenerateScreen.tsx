import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  BackHandler,
  Image,
} from "react-native";
import { useRoute, useNavigation, RouteProp, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Share2, Download, CheckCircle2 } from "lucide-react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useQuery } from "@tanstack/react-query";

import { useTheme } from "../../theme";
import { APP_CONFIG } from "../../config/app.config";
import { TechnicianStackParamList } from "../../types/navigation.types";
import { useJobDetails } from "../../hooks/useJobs";
import { PaymentService } from "../../services/payment.service";
import { numberToIndianWords } from "../../utils/numberToWords";
import { AppHeader } from "../../components/AppHeader";
import { AppButton } from "../../components/AppButton";
import { AppLoader } from "../../components/AppLoader";
import { AppAlertModal } from "../../components/AppAlertModal";

type RouteProps = RouteProp<TechnicianStackParamList, "InvoiceGenerate">;
type NavigationProp = NativeStackNavigationProp<TechnicianStackParamList, "InvoiceGenerate">;

export const InvoiceGenerateScreen = () => {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();

  const handleBack = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "TechnicianHome" }],
    });
  };

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        handleBack();
        return true;
      };

      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);

      return () => subscription.remove();
    }, [navigation])
  );

  const {
    jobId,
    ticketNo,
    amount: initialAmount,
    paymentMethod: initialPaymentMethod,
    invoiceNo,
    invoiceSubtotal,
    invoiceGstAmount,
    invoiceGstPercent,
    invoiceTotal,
    invoiceGeneratedAt,
  } = route.params;

  const { data: job, isLoading } = useJobDetails(jobId);
  const { data: paymentConfig } = useQuery({
    queryKey: ["mobilePaymentConfig"],
    queryFn: PaymentService.getMobilePaymentConfig,
    staleTime: 60_000,
  });

  const [downloading, setDownloading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error" | "warning">("success");

  const paymentMethod = initialPaymentMethod || job?.paymentMethod || "CASH";
  const paymentStatus = job?.paymentStatus || "COLLECTED";

  // Exact Persisted Invoice Amounts from Backend / Route params
  const serviceCharge = job?.invoiceServiceCharge ?? 0;
  const labourCharge = job?.invoiceLabourCharge ?? 0;
  const sparePartsAmount = job?.invoiceSparePartsAmount ?? 0;
  const additionalCharge = job?.invoiceAdditionalCharge ?? 0;
  const discount = job?.invoiceDiscount ?? 0;
  const baseAmount = job?.invoiceSubtotal ?? invoiceSubtotal ?? 0;
  const gstAmount = job?.invoiceGstAmount ?? invoiceGstAmount ?? 0;
  const gstPercent = job?.invoiceGstPercent ?? invoiceGstPercent ?? (paymentConfig?.gstPercent ?? 0);
  const totalAmount = job?.invoiceTotal ?? invoiceTotal ?? initialAmount ?? 0;

  const rawInvoiceDate = job?.invoiceGeneratedAt ?? invoiceGeneratedAt;
  const invoiceDate = rawInvoiceDate
    ? new Date(rawInvoiceDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })
    : new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

  const invoiceTime = rawInvoiceDate
    ? new Date(rawInvoiceDate).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      })
    : "";

  // Dynamic Tenant Branding & Details (No hardcoded reference companies)
  const tenantName = job?.tenant?.companyName || APP_CONFIG.appName || "FIELDEAZE";
  const tenantAddress = job?.tenant?.address || "";
  const tenantCity = job?.tenant?.city || "";
  const tenantState = job?.tenant?.state || "";
  const tenantPincode = job?.tenant?.pincode || "";
  const tenantPhone = job?.tenant?.phone || "";
  const tenantEmail = job?.tenant?.email || "";
  const tenantGstin = job?.tenant?.gstin || job?.tenant?.gstNumber || paymentConfig?.gstNumber || "";
  const tenantLogoUrl = job?.tenant?.logoUrl || (APP_CONFIG as any).logo || null;
  const tenantSignatureUrl = job?.tenant?.signatureUrl || job?.tenant?.authorizedSignatureUrl || null;
  const termsAndConditions = job?.tenant?.termsAndConditions || null;

  // Customer Details
  const customerName = job?.customerName || "Customer";
  const customerMobile = job?.customerMobile || "";
  const customerAddress = job?.customerAddress || job?.address || "";
  const customerCity = job?.customerCity || "";
  const customerState = job?.customerState || "";
  const customerPincode = job?.customerPincode || "";
  const customerGstin = job?.customerGstin || "";

  // Service Line Information
  const service = job?.service || "General Service";
  const category = job?.category || "Service";

  const billableServiceCharge = job?.paymentServiceChargeWaived ? 0 : serviceCharge;
  const billableLabourCharge = job?.paymentLabourChargeWaived ? 0 : labourCharge;
  const billableSpareParts = sparePartsAmount > 0 ? sparePartsAmount : 0;
  const billableAdditional = additionalCharge > 0 ? additionalCharge : 0;
  const billableDiscount = discount > 0 ? discount : 0;

  const calculatedGst = gstAmount > 0
    ? gstAmount
    : (gstPercent > 0 && billableServiceCharge > 0)
      ? Math.round(((billableServiceCharge * gstPercent) / 100) * 100) / 100
      : 0;

  const calculatedSubtotal = baseAmount > 0
    ? baseAmount
    : billableServiceCharge + billableLabourCharge + billableSpareParts + billableAdditional - billableDiscount;

  const calculatedTotal = totalAmount > 0
    ? totalAmount
    : Math.max(0, calculatedSubtotal + calculatedGst);

  const amountInWords = numberToIndianWords(calculatedTotal);

  const chargeableParts = job?.spareParts?.filter((p) => p.coverageType === "OUT_OF_WARRANTY") ?? [];
  const warrantyParts = job?.spareParts?.filter((p) => p.coverageType === "WARRANTY") ?? [];

  const totalQuantitySum = 1 + (job?.spareParts ?? []).reduce((acc, p) => acc + (p.quantity || 1), 0) + (labourCharge > 0 ? 1 : 0) + (billableAdditional > 0 ? 1 : 0);

  const showAlert = (title: string, message: string, type: "success" | "error" | "warning" = "success") => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const generatePDF = async () => {
    let itemIdx = 1;
    let tableRowsHtml = "";

    // 1. Service Row
    if (serviceCharge > 0 || job?.paymentServiceChargeWaived) {
      tableRowsHtml += `
        <tr>
          <td style="border: 1px solid #475569; padding: 6px 8px; text-align: center; font-size: 11px;">${itemIdx++}</td>
          <td style="border: 1px solid #475569; padding: 6px 10px; font-size: 11px;">
            <strong>${service}</strong>
            <div style="font-size: 10px; color: #4b5563;">${category}${job?.paymentServiceChargeWaived ? " (Covered by AMC)" : ""}</div>
          </td>
          <td style="border: 1px solid #475569; padding: 6px 8px; text-align: center; font-size: 11px;">1</td>
          <td style="border: 1px solid #475569; padding: 6px 8px; text-align: center; font-size: 11px;">Job</td>
          <td style="border: 1px solid #475569; padding: 6px 10px; text-align: right; font-size: 11px;">${job?.paymentServiceChargeWaived ? "FREE" : fmt(serviceCharge)}</td>
          <td style="border: 1px solid #475569; padding: 6px 10px; text-align: right; font-size: 11px; font-weight: bold;">${job?.paymentServiceChargeWaived ? "FREE" : fmt(billableServiceCharge)}</td>
        </tr>
      `;
    }

    // 2. Spare Parts Rows
    chargeableParts.forEach((p) => {
      const lineTotal = p.unitPrice * p.quantity;
      tableRowsHtml += `
        <tr>
          <td style="border: 1px solid #475569; padding: 6px 8px; text-align: center; font-size: 11px;">${itemIdx++}</td>
          <td style="border: 1px solid #475569; padding: 6px 10px; font-size: 11px;">${p.name}</td>
          <td style="border: 1px solid #475569; padding: 6px 8px; text-align: center; font-size: 11px;">${p.quantity}</td>
          <td style="border: 1px solid #475569; padding: 6px 8px; text-align: center; font-size: 11px;">${p.unitOfMeasure || "Nos"}</td>
          <td style="border: 1px solid #475569; padding: 6px 10px; text-align: right; font-size: 11px;">${fmt(p.unitPrice)}</td>
          <td style="border: 1px solid #475569; padding: 6px 10px; text-align: right; font-size: 11px; font-weight: bold;">${fmt(lineTotal)}</td>
        </tr>
      `;
    });

    warrantyParts.forEach((p) => {
      tableRowsHtml += `
        <tr>
          <td style="border: 1px solid #475569; padding: 6px 8px; text-align: center; font-size: 11px;">${itemIdx++}</td>
          <td style="border: 1px solid #475569; padding: 6px 10px; font-size: 11px;">
            ${p.name} <span style="color: #16a34a; font-size: 10px;">(Warranty Covered)</span>
          </td>
          <td style="border: 1px solid #475569; padding: 6px 8px; text-align: center; font-size: 11px;">${p.quantity}</td>
          <td style="border: 1px solid #475569; padding: 6px 8px; text-align: center; font-size: 11px;">${p.unitOfMeasure || "Nos"}</td>
          <td style="border: 1px solid #475569; padding: 6px 10px; text-align: right; font-size: 11px; text-decoration: line-through; color: #9ca3af;">${fmt(p.unitPrice)}</td>
          <td style="border: 1px solid #475569; padding: 6px 10px; text-align: right; font-size: 11px; font-weight: bold; color: #16a34a;">FREE</td>
        </tr>
      `;
    });

    // 3. Labour Charge Row
    if (labourCharge > 0 || job?.paymentLabourChargeWaived) {
      tableRowsHtml += `
        <tr>
          <td style="border: 1px solid #475569; padding: 6px 8px; text-align: center; font-size: 11px;">${itemIdx++}</td>
          <td style="border: 1px solid #475569; padding: 6px 10px; font-size: 11px;">Labour Charge</td>
          <td style="border: 1px solid #475569; padding: 6px 8px; text-align: center; font-size: 11px;">1</td>
          <td style="border: 1px solid #475569; padding: 6px 8px; text-align: center; font-size: 11px;">Job</td>
          <td style="border: 1px solid #475569; padding: 6px 10px; text-align: right; font-size: 11px;">${job?.paymentLabourChargeWaived ? "FREE" : fmt(labourCharge)}</td>
          <td style="border: 1px solid #475569; padding: 6px 10px; text-align: right; font-size: 11px; font-weight: bold;">${job?.paymentLabourChargeWaived ? "FREE" : fmt(billableLabourCharge)}</td>
        </tr>
      `;
    }

    // 4. Additional Charges
    if (billableAdditional > 0) {
      tableRowsHtml += `
        <tr>
          <td style="border: 1px solid #475569; padding: 6px 8px; text-align: center; font-size: 11px;">${itemIdx++}</td>
          <td style="border: 1px solid #475569; padding: 6px 10px; font-size: 11px;">Additional Charges</td>
          <td style="border: 1px solid #475569; padding: 6px 8px; text-align: center; font-size: 11px;">1</td>
          <td style="border: 1px solid #475569; padding: 6px 8px; text-align: center; font-size: 11px;">Job</td>
          <td style="border: 1px solid #475569; padding: 6px 10px; text-align: right; font-size: 11px;">${fmt(billableAdditional)}</td>
          <td style="border: 1px solid #475569; padding: 6px 10px; text-align: right; font-size: 11px; font-weight: bold;">${fmt(billableAdditional)}</td>
        </tr>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Service Bill #${invoiceNo}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #111827;
            background-color: #ffffff;
            padding: 30px 40px;
            font-size: 11px;
            line-height: 1.4;
          }
          .invoice-paper {
            max-width: 800px;
            margin: 0 auto;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
          }
          .company-info {
            max-width: 65%;
          }
          .company-name {
            font-size: 18px;
            font-weight: 800;
            color: #111827;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 3px;
          }
          .company-text {
            font-size: 11px;
            color: #374151;
            margin-top: 1px;
          }
          .company-logo {
            max-height: 60px;
            max-width: 140px;
            object-fit: contain;
          }
          .logo-box {
            width: 60px;
            height: 60px;
            border: 1.5px solid #111827;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            font-weight: 800;
            color: #111827;
          }
          .divider {
            border: none;
            border-top: 1.5px solid #111827;
            margin: 10px 0;
          }
          .thin-divider {
            border: none;
            border-top: 1px solid #cbd5e1;
            margin: 8px 0;
          }
          .title-center {
            text-align: center;
            font-size: 15px;
            font-weight: 800;
            letter-spacing: 1px;
            text-transform: uppercase;
            padding: 4px 0;
            margin-bottom: 10px;
            border-top: 1.5px solid #111827;
            border-bottom: 1.5px solid #111827;
          }
          .meta-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
          }
          .meta-col {
            width: 48%;
          }
          .meta-title {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            margin-bottom: 4px;
            color: #111827;
          }
          .meta-line {
            font-size: 11px;
            color: #1f2937;
            margin-bottom: 2px;
          }
          .meta-table-right {
            width: 100%;
          }
          .meta-table-right td {
            padding: 1.5px 0;
            font-size: 11px;
          }
          .table-container {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #475569;
            margin-top: 6px;
            margin-bottom: 12px;
          }
          .table-container th {
            background-color: #1e293b;
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            padding: 6px 8px;
            border: 1px solid #475569;
            text-transform: capitalize;
          }
          .table-container td {
            border: 1px solid #475569;
          }
          .total-row-table {
            background-color: #f9fafb;
            font-weight: bold;
          }
          .total-row-table td {
            padding: 6px 10px;
            border: 1px solid #475569;
            font-size: 11px;
          }
          .bottom-section {
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
          }
          .bottom-left {
            width: 54%;
            padding-right: 20px;
          }
          .bottom-right {
            width: 44%;
          }
          .amount-words-title {
            font-weight: 800;
            font-size: 11px;
            margin-bottom: 2px;
          }
          .amount-words-val {
            font-style: italic;
            font-size: 11px;
            color: #1f2937;
            margin-bottom: 16px;
          }
          .terms-title {
            font-weight: 800;
            font-size: 11px;
            margin-bottom: 4px;
          }
          .terms-list {
            font-size: 10px;
            color: #4b5563;
            line-height: 1.4;
            padding-left: 14px;
          }
          .totals-table {
            width: 100%;
            border-collapse: collapse;
          }
          .totals-table td {
            padding: 3px 0;
            font-size: 11px;
          }
          .totals-table .val-col {
            text-align: right;
            font-weight: 600;
          }
          .totals-table .grand-row td {
            font-size: 12px;
            font-weight: 800;
            border-top: 1.5px solid #111827;
            border-bottom: 1.5px solid #111827;
            padding: 5px 0;
          }
          .signatory-container {
            margin-top: 24px;
            text-align: right;
          }
          .sign-for {
            font-weight: 700;
            font-size: 11px;
            margin-bottom: 30px;
          }
          .sign-line {
            font-size: 11px;
            font-weight: 700;
            display: inline-block;
            border-top: 1px solid #111827;
            padding-top: 3px;
            min-width: 140px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="invoice-paper">
          <!-- 1. Header -->
          <div class="header-row">
            <div class="company-info">
              <div class="company-name">${tenantName}</div>
              ${tenantAddress ? `<div class="company-text">${tenantAddress}</div>` : ""}
              ${(tenantCity || tenantState) ? `<div class="company-text">${[tenantCity, tenantState ? (tenantPincode ? `${tenantState} - ${tenantPincode}` : tenantState) : tenantPincode].filter(Boolean).join(", ")}</div>` : ""}
              ${tenantPhone ? `<div class="company-text">Phone: ${tenantPhone}</div>` : ""}
              ${tenantGstin ? `<div class="company-text">GSTIN: ${tenantGstin}</div>` : ""}
              ${tenantState ? `<div class="company-text">State: ${tenantState}</div>` : ""}
            </div>
            <div>
              ${tenantLogoUrl ? `<img src="${tenantLogoUrl}" class="company-logo" alt="Logo" />` : `<div class="logo-box">${tenantName.substring(0, 2).toUpperCase()}</div>`}
            </div>
          </div>

          <!-- 2. SERVICE BILL Title -->
          <div class="title-center">SERVICE BILL</div>

          <!-- 3. Bill To & Invoice Details -->
          <div class="meta-section">
            <div class="meta-col">
              <div class="meta-title">Bill To:</div>
              <div class="meta-line" style="font-weight: 700;">${customerName}</div>
              ${customerAddress ? `<div class="meta-line">${customerAddress}</div>` : ""}
              ${(customerCity || customerState) ? `<div class="meta-line">${[customerCity, customerState ? (customerPincode ? `${customerState} - ${customerPincode}` : customerState) : customerPincode].filter(Boolean).join(", ")}</div>` : ""}
              ${customerMobile ? `<div class="meta-line">Phone: ${customerMobile}</div>` : ""}
              ${customerState ? `<div class="meta-line">State: ${customerState}</div>` : ""}
              ${customerGstin ? `<div class="meta-line">GSTIN: ${customerGstin}</div>` : ""}
            </div>

            <div class="meta-col">
              <div class="meta-title">Invoice Details:</div>
              <table class="meta-table-right">
                <tr>
                  <td style="color: #4b5563; width: 110px;">Invoice No.</td>
                  <td style="font-weight: 700;">: #${invoiceNo}</td>
                </tr>
                <tr>
                  <td style="color: #4b5563;">Date</td>
                  <td>: ${invoiceDate}</td>
                </tr>
                ${invoiceTime ? `
                <tr>
                  <td style="color: #4b5563;">Time</td>
                  <td>: ${invoiceTime}</td>
                </tr>` : ""}
                <tr>
                  <td style="color: #4b5563;">Place of Supply</td>
                  <td>: ${customerState || tenantState || "—"}</td>
                </tr>
                <tr>
                  <td style="color: #4b5563;">Payment Method</td>
                  <td>: ${paymentMethod}</td>
                </tr>
                <tr>
                  <td style="color: #4b5563;">Payment Status</td>
                  <td style="font-weight: 700; color: #16a34a;">: ${paymentStatus}</td>
                </tr>
              </table>
            </div>
          </div>

          <!-- 4. Item Table -->
          <table class="table-container">
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">#</th>
                <th style="text-align: left;">Item name</th>
                <th style="width: 65px; text-align: center;">Quantity</th>
                <th style="width: 55px; text-align: center;">Unit</th>
                <th style="width: 100px; text-align: right;">Price / Unit</th>
                <th style="width: 110px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
              <tr class="total-row-table">
                <td colspan="2" style="text-align: right;">Total</td>
                <td style="text-align: center;">${totalQuantitySum}</td>
                <td></td>
                <td></td>
                <td style="text-align: right;">${fmt(calculatedSubtotal)}</td>
              </tr>
            </tbody>
          </table>

          <!-- 5. Bottom Section: Words & Terms on Left, Totals & Signature on Right -->
          <div class="bottom-section">
            <div class="bottom-left">
              <div class="amount-words-title">Invoice Amount in Words</div>
              <div class="amount-words-val">${amountInWords}</div>

              <div class="terms-title">Terms and Conditions</div>
              <ul class="terms-list">
                ${termsAndConditions ? `<li>${termsAndConditions}</li>` : `
                <li>All services carried out by certified service personnel.</li>
                <li>Warranty on spare parts is covered as per manufacturer policy.</li>
                <li>Please retain this service bill for warranty verification.</li>
                `}
              </ul>
            </div>

            <div class="bottom-right">
              <table class="totals-table">
                <tr>
                  <td>Sub Total</td>
                  <td class="val-col">${fmt(calculatedSubtotal)}</td>
                </tr>
                ${billableDiscount > 0 ? `
                <tr>
                  <td style="color: #16a34a;">Discount</td>
                  <td class="val-col" style="color: #16a34a;">-${fmt(billableDiscount)}</td>
                </tr>` : ""}
                ${calculatedGst > 0 ? `
                <tr>
                  <td>GST (${gstPercent}%)</td>
                  <td class="val-col">${fmt(calculatedGst)}</td>
                </tr>` : ""}
                <tr class="grand-row">
                  <td>Total</td>
                  <td class="val-col">${fmt(calculatedTotal)}</td>
                </tr>
                <tr>
                  <td style="color: #4b5563; padding-top: 4px;">Received</td>
                  <td class="val-col" style="padding-top: 4px;">${fmt(calculatedTotal)}</td>
                </tr>
                <tr>
                  <td style="color: #4b5563;">Balance</td>
                  <td class="val-col">₹0.00</td>
                </tr>
              </table>

              <div class="signatory-container">
                <div class="sign-for">For: ${tenantName}</div>
                ${tenantSignatureUrl ? `
                  <div style="margin-bottom: 4px;">
                    <img src="${tenantSignatureUrl}" style="max-height: 40px; max-width: 120px; object-fit: contain;" alt="Signature" />
                  </div>
                ` : `
                  <div style="height: 32px;"></div>
                `}
                <div class="sign-line">Authorized Signatory</div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  };

  const handleShare = async () => {
    try {
      const uri = await generatePDF();
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `Share Service Bill #${invoiceNo}`,
        UTI: "com.adobe.pdf",
      });
    } catch (err: any) {
      showAlert("Share Failed", "We couldn't share the invoice details. Please try again.", "error");
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const uri = await generatePDF();
      if (Platform.OS === "ios") {
        await Sharing.shareAsync(uri);
      } else {
        await Print.printAsync({ uri });
      }
      showAlert("Invoice Ready", `Service Bill PDF for #${invoiceNo} is ready.`, "success");
    } catch (err: any) {
      showAlert("Download Failed", "We couldn't download the invoice. Please try again.", "error");
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="Invoice Details" showBack onBackPress={handleBack} />
        <AppLoader message="Loading invoice..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: "#f3f4f6" }]}>
      <AppHeader
        title="Job Invoice"
        subtitle={ticketNo}
        showBack={true}
        onBackPress={handleBack}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Success Check Banner */}
        <View style={styles.centerCol}>
          <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.success}15` }]}>
            <CheckCircle2 size={40} color={theme.colors.success} />
          </View>
          <Text style={[styles.title, { color: "#111827" }]}>Payment & Job Closed</Text>
          <Text style={[styles.subtitle, { color: "#6b7280" }]}>
            The job has been completed. The official service bill has been generated.
          </Text>
        </View>

        {/* ── AUTHENTIC PAPER SERVICE BILL SHEET PREVIEW ───────────────────────── */}
        <View style={styles.paperSheet}>
          {/* Header Row: Company Details on Left, Logo on Right */}
          <View style={styles.sheetHeaderRow}>
            <View style={styles.sheetCompanyInfo}>
              <Text style={styles.sheetCompanyName}>{tenantName}</Text>
              {tenantAddress ? <Text style={styles.sheetCompanyText}>{tenantAddress}</Text> : null}
              {(tenantCity || tenantState) ? (
                <Text style={styles.sheetCompanyText}>
                  {[tenantCity, tenantState ? (tenantPincode ? `${tenantState} - ${tenantPincode}` : tenantState) : tenantPincode].filter(Boolean).join(", ")}
                </Text>
              ) : null}
              {tenantPhone ? <Text style={styles.sheetCompanyText}>Phone: {tenantPhone}</Text> : null}
              {tenantGstin ? <Text style={styles.sheetCompanyText}>GSTIN: {tenantGstin}</Text> : null}
              {tenantState ? <Text style={styles.sheetCompanyText}>State: {tenantState}</Text> : null}
            </View>

            {tenantLogoUrl ? (
              <Image source={{ uri: tenantLogoUrl }} style={styles.sheetLogo} resizeMode="contain" />
            ) : (
              <View style={styles.sheetLogoBox}>
                <Text style={styles.sheetLogoText}>{tenantName.substring(0, 2).toUpperCase()}</Text>
              </View>
            )}
          </View>

          {/* Centered Service Bill Title */}
          <View style={styles.sheetTitleContainer}>
            <Text style={styles.sheetTitleText}>SERVICE BILL</Text>
          </View>

          {/* 2-Column Meta: Bill To (Left) & Invoice Details (Right) */}
          <View style={styles.sheetMetaRow}>
            {/* Bill To */}
            <View style={styles.sheetMetaLeft}>
              <Text style={styles.sheetMetaHeading}>Bill To:</Text>
              <Text style={styles.sheetCustomerName}>{customerName}</Text>
              {customerAddress ? <Text style={styles.sheetMetaLine}>{customerAddress}</Text> : null}
              {(customerCity || customerState) ? (
                <Text style={styles.sheetMetaLine}>
                  {[customerCity, customerState ? (customerPincode ? `${customerState} - ${customerPincode}` : customerState) : customerPincode].filter(Boolean).join(", ")}
                </Text>
              ) : null}
              {customerMobile ? <Text style={styles.sheetMetaLine}>Phone: {customerMobile}</Text> : null}
              {customerState ? <Text style={styles.sheetMetaLine}>State: {customerState}</Text> : null}
              {customerGstin ? <Text style={styles.sheetMetaLine}>GSTIN: {customerGstin}</Text> : null}
            </View>

            {/* Invoice Details */}
            <View style={styles.sheetMetaRight}>
              <Text style={styles.sheetMetaHeading}>Invoice Details:</Text>
              <View style={styles.inlineMetaRow}>
                <Text style={styles.inlineMetaLabel}>Invoice No.</Text>
                <Text style={styles.inlineMetaVal}>: #{invoiceNo}</Text>
              </View>
              <View style={styles.inlineMetaRow}>
                <Text style={styles.inlineMetaLabel}>Date</Text>
                <Text style={styles.inlineMetaVal}>: {invoiceDate}</Text>
              </View>
              {invoiceTime ? (
                <View style={styles.inlineMetaRow}>
                  <Text style={styles.inlineMetaLabel}>Time</Text>
                  <Text style={styles.inlineMetaVal}>: {invoiceTime}</Text>
                </View>
              ) : null}
              <View style={styles.inlineMetaRow}>
                <Text style={styles.inlineMetaLabel}>Place of Supply</Text>
                <Text style={styles.inlineMetaVal}>: {customerState || tenantState || "—"}</Text>
              </View>
              <View style={styles.inlineMetaRow}>
                <Text style={styles.inlineMetaLabel}>Payment Method</Text>
                <Text style={styles.inlineMetaVal}>: {paymentMethod}</Text>
              </View>
              <View style={styles.inlineMetaRow}>
                <Text style={styles.inlineMetaLabel}>Payment Status</Text>
                <Text style={[styles.inlineMetaVal, { color: theme.colors.success, fontWeight: "700" }]}>: {paymentStatus}</Text>
              </View>
            </View>
          </View>

          {/* ── Table Container ───────────────────────────────────────── */}
          <View style={styles.sheetTable}>
            {/* Header */}
            <View style={styles.sheetTableHeader}>
              <Text style={[styles.th, { width: 24, textAlign: "center" }]}>#</Text>
              <Text style={[styles.th, { flex: 1 }]}>Item name</Text>
              <Text style={[styles.th, { width: 34, textAlign: "center" }]}>Qty</Text>
              <Text style={[styles.th, { width: 34, textAlign: "center" }]}>Unit</Text>
              <Text style={[styles.th, { width: 62, textAlign: "right" }]}>Price/Unit</Text>
              <Text style={[styles.th, { width: 70, textAlign: "right" }]}>Amount</Text>
            </View>

            {/* Service Charge */}
            {(serviceCharge > 0 || job?.paymentServiceChargeWaived) ? (
              <View style={styles.sheetTableRow}>
                <Text style={[styles.td, { width: 24, textAlign: "center" }]}>1</Text>
                <View style={{ flex: 1, paddingRight: 4 }}>
                  <Text style={styles.tableItemTitle}>{service}</Text>
                  <Text style={styles.tableItemSub}>{category}{job?.paymentServiceChargeWaived ? " (AMC)" : ""}</Text>
                </View>
                <Text style={[styles.td, { width: 34, textAlign: "center" }]}>1</Text>
                <Text style={[styles.td, { width: 34, textAlign: "center" }]}>Job</Text>
                <Text style={[styles.td, { width: 62, textAlign: "right" }]}>
                  {job?.paymentServiceChargeWaived ? "FREE" : fmt(serviceCharge)}
                </Text>
                <Text style={[styles.td, { width: 70, textAlign: "right", fontWeight: "700" }]}>
                  {job?.paymentServiceChargeWaived ? "FREE" : fmt(billableServiceCharge)}
                </Text>
              </View>
            ) : null}

            {/* Chargeable Spare Parts */}
            {chargeableParts.map((p, idx) => (
              <View key={`chargeable-${idx}`} style={styles.sheetTableRow}>
                <Text style={[styles.td, { width: 24, textAlign: "center" }]}>{2 + idx}</Text>
                <Text style={[styles.td, { flex: 1, paddingRight: 4 }]}>{p.name}</Text>
                <Text style={[styles.td, { width: 34, textAlign: "center" }]}>{p.quantity}</Text>
                <Text style={[styles.td, { width: 34, textAlign: "center" }]}>{p.unitOfMeasure || "Nos"}</Text>
                <Text style={[styles.td, { width: 62, textAlign: "right" }]}>{fmt(p.unitPrice)}</Text>
                <Text style={[styles.td, { width: 70, textAlign: "right", fontWeight: "700" }]}>{fmt(p.unitPrice * p.quantity)}</Text>
              </View>
            ))}

            {/* Warranty Spare Parts */}
            {warrantyParts.map((p, idx) => (
              <View key={`warranty-${idx}`} style={styles.sheetTableRow}>
                <Text style={[styles.td, { width: 24, textAlign: "center" }]}>{2 + chargeableParts.length + idx}</Text>
                <View style={{ flex: 1, paddingRight: 4 }}>
                  <Text style={styles.tableItemTitle}>{p.name}</Text>
                  <Text style={[styles.tableItemSub, { color: theme.colors.success }]}>Warranty Covered</Text>
                </View>
                <Text style={[styles.td, { width: 34, textAlign: "center" }]}>{p.quantity}</Text>
                <Text style={[styles.td, { width: 34, textAlign: "center" }]}>{p.unitOfMeasure || "Nos"}</Text>
                <Text style={[styles.td, { width: 62, textAlign: "right", textDecorationLine: "line-through", color: "#9ca3af" }]}>
                  {fmt(p.unitPrice)}
                </Text>
                <Text style={[styles.td, { width: 70, textAlign: "right", fontWeight: "700", color: theme.colors.success }]}>FREE</Text>
              </View>
            ))}

            {/* Labour Charge */}
            {(labourCharge > 0 || job?.paymentLabourChargeWaived) ? (
              <View style={styles.sheetTableRow}>
                <Text style={[styles.td, { width: 24, textAlign: "center" }]}>{2 + (job?.spareParts?.length ?? 0)}</Text>
                <Text style={[styles.td, { flex: 1, paddingRight: 4 }]}>Labour Charge</Text>
                <Text style={[styles.td, { width: 34, textAlign: "center" }]}>1</Text>
                <Text style={[styles.td, { width: 34, textAlign: "center" }]}>Job</Text>
                <Text style={[styles.td, { width: 62, textAlign: "right" }]}>
                  {job?.paymentLabourChargeWaived ? "FREE" : fmt(labourCharge)}
                </Text>
                <Text style={[styles.td, { width: 70, textAlign: "right", fontWeight: "700" }]}>
                  {job?.paymentLabourChargeWaived ? "FREE" : fmt(billableLabourCharge)}
                </Text>
              </View>
            ) : null}

            {/* Additional Charges */}
            {billableAdditional > 0 ? (
              <View style={styles.sheetTableRow}>
                <Text style={[styles.td, { width: 24, textAlign: "center" }]}>{2 + (job?.spareParts?.length ?? 0) + (labourCharge > 0 ? 1 : 0)}</Text>
                <Text style={[styles.td, { flex: 1, paddingRight: 4 }]}>Additional Charges</Text>
                <Text style={[styles.td, { width: 34, textAlign: "center" }]}>1</Text>
                <Text style={[styles.td, { width: 34, textAlign: "center" }]}>Job</Text>
                <Text style={[styles.td, { width: 62, textAlign: "right" }]}>{fmt(billableAdditional)}</Text>
                <Text style={[styles.td, { width: 70, textAlign: "right", fontWeight: "700" }]}>{fmt(billableAdditional)}</Text>
              </View>
            ) : null}

            {/* Total Row */}
            <View style={styles.sheetTableTotalRow}>
              <Text style={[styles.tdTotal, { flex: 1, textAlign: "right", paddingRight: 8 }]}>Total</Text>
              <Text style={[styles.tdTotal, { width: 34, textAlign: "center" }]}>{totalQuantitySum}</Text>
              <Text style={[styles.tdTotal, { width: 34 }]}></Text>
              <Text style={[styles.tdTotal, { width: 62 }]}></Text>
              <Text style={[styles.tdTotal, { width: 70, textAlign: "right" }]}>{fmt(calculatedSubtotal)}</Text>
            </View>
          </View>

          {/* ── Bottom Section: Words & Terms (Left) / Totals & Signatory (Right) ─ */}
          <View style={styles.sheetBottomRow}>
            {/* Left: Words + Terms */}
            <View style={styles.sheetBottomLeft}>
              <Text style={styles.amountWordsHeading}>Invoice Amount in Words</Text>
              <Text style={styles.amountWordsText}>{amountInWords}</Text>

              <Text style={styles.termsHeading}>Terms and Conditions</Text>
              <Text style={styles.termsItem}>• All services completed by certified technicians.</Text>
              <Text style={styles.termsItem}>• Warranty on spare parts as per manufacturer policy.</Text>
              <Text style={styles.termsItem}>• Please retain this service bill for warranty verification.</Text>
            </View>

            {/* Right: Totals + Signature */}
            <View style={styles.sheetBottomRight}>
              <View style={styles.summaryLine}>
                <Text style={styles.summaryLabel}>Sub Total</Text>
                <Text style={styles.summaryVal}>{fmt(calculatedSubtotal)}</Text>
              </View>
              {billableDiscount > 0 ? (
                <View style={styles.summaryLine}>
                  <Text style={[styles.summaryLabel, { color: theme.colors.success }]}>Discount</Text>
                  <Text style={[styles.summaryVal, { color: theme.colors.success }]}>-{fmt(billableDiscount)}</Text>
                </View>
              ) : null}
              {calculatedGst > 0 ? (
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLabel}>GST ({gstPercent}%)</Text>
                  <Text style={styles.summaryVal}>{fmt(calculatedGst)}</Text>
                </View>
              ) : null}

              <View style={styles.grandSummaryLine}>
                <Text style={styles.grandSummaryLabel}>Total</Text>
                <Text style={styles.grandSummaryVal}>{fmt(calculatedTotal)}</Text>
              </View>

              <View style={styles.summaryLine}>
                <Text style={[styles.summaryLabel, { color: "#6b7280" }]}>Received</Text>
                <Text style={[styles.summaryVal, { color: "#111827" }]}>{fmt(calculatedTotal)}</Text>
              </View>
              <View style={styles.summaryLine}>
                <Text style={[styles.summaryLabel, { color: "#6b7280" }]}>Balance</Text>
                <Text style={[styles.summaryVal, { color: "#111827" }]}>₹0.00</Text>
              </View>

              <View style={styles.signatoryBlock}>
                <Text style={styles.signForLabel}>For: {tenantName}</Text>
                {tenantSignatureUrl ? (
                  <Image source={{ uri: tenantSignatureUrl }} style={styles.signImage} resizeMode="contain" />
                ) : (
                  <View style={styles.signSpace} />
                )}
                <View style={styles.signUnderline} />
                <Text style={styles.signatoryDesignation}>Authorized Signatory</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Options */}
        <View style={styles.actions}>
          <View style={styles.btnRow}>
            <AppButton
              title={downloading ? "Downloading..." : "Download PDF"}
              onPress={handleDownload}
              variant="outline"
              style={{ flex: 1 }}
              loading={downloading}
              icon={<Download size={18} color={theme.colors.primary} />}
            />
            <AppButton
              title="Share Invoice"
              onPress={handleShare}
              variant="outline"
              style={{ flex: 1 }}
              icon={<Share2 size={18} color={theme.colors.primary} />}
            />
          </View>

          <AppButton
            title="Completed Ticket"
            onPress={() => navigation.navigate("TechnicianHome")}
            variant="primary"
            size="lg"
            style={{ marginTop: 8 }}
          />
        </View>
      </ScrollView>

      {/* Alert popup modal */}
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
  content: { padding: 14, paddingBottom: 40 },
  centerCol: { alignItems: "center", marginBottom: 14, marginTop: 2 },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  title: { fontSize: 17, fontWeight: "800", marginBottom: 2 },
  subtitle: { fontSize: 12, textAlign: "center", lineHeight: 16, paddingHorizontal: 16 },

  // ── AUTHENTIC SERVICE BILL PAPER SHEET ─────────────────────────────
  paperSheet: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 8,
  },
  sheetCompanyInfo: {
    flex: 1,
    paddingRight: 10,
  },
  sheetCompanyName: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  sheetCompanyText: {
    fontSize: 10.5,
    color: "#374151",
    marginTop: 1.5,
    lineHeight: 14,
  },
  sheetLogo: {
    width: 54,
    height: 54,
  },
  sheetLogoBox: {
    width: 50,
    height: 50,
    borderWidth: 1.5,
    borderColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetLogoText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  sheetTitleContainer: {
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: "#111827",
    paddingVertical: 4,
    marginVertical: 8,
    alignItems: "center",
  },
  sheetTitleText: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: "#111827",
  },
  sheetMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sheetMetaLeft: {
    flex: 1.1,
    paddingRight: 6,
  },
  sheetMetaRight: {
    flex: 0.9,
    paddingLeft: 4,
  },
  sheetMetaHeading: {
    fontSize: 11,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 2,
  },
  sheetCustomerName: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#111827",
  },
  sheetMetaLine: {
    fontSize: 10,
    color: "#374151",
    marginTop: 1,
    lineHeight: 13,
  },
  inlineMetaRow: {
    flexDirection: "row",
    marginTop: 1,
  },
  inlineMetaLabel: {
    width: 78,
    fontSize: 10,
    color: "#4b5563",
  },
  inlineMetaVal: {
    flex: 1,
    fontSize: 10,
    color: "#111827",
    fontWeight: "600",
  },

  // ── Table ──────────────────────────────────────────────────────────
  sheetTable: {
    borderWidth: 1,
    borderColor: "#475569",
    marginBottom: 10,
  },
  sheetTableHeader: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#475569",
  },
  th: {
    fontSize: 10,
    fontWeight: "700",
    color: "#ffffff",
  },
  sheetTableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#475569",
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  td: {
    fontSize: 10.5,
    color: "#111827",
  },
  tableItemTitle: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#111827",
  },
  tableItemSub: {
    fontSize: 9,
    color: "#6b7280",
  },
  sheetTableTotalRow: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    paddingVertical: 5,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  tdTotal: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#111827",
  },

  // ── Bottom 2-Column: Words/Terms on Left, Totals/Signature on Right ─
  sheetBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sheetBottomLeft: {
    flex: 1.1,
    paddingRight: 10,
  },
  sheetBottomRight: {
    flex: 0.9,
  },
  amountWordsHeading: {
    fontSize: 10,
    fontWeight: "800",
    color: "#111827",
  },
  amountWordsText: {
    fontSize: 10,
    fontStyle: "italic",
    color: "#1f2937",
    marginTop: 1,
    marginBottom: 10,
    lineHeight: 14,
  },
  termsHeading: {
    fontSize: 10,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 2,
  },
  termsItem: {
    fontSize: 9,
    color: "#4b5563",
    lineHeight: 12.5,
    marginTop: 1,
  },
  summaryLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 1.5,
  },
  summaryLabel: {
    fontSize: 10.5,
    color: "#374151",
  },
  summaryVal: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#111827",
  },
  grandSummaryLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: "#111827",
    paddingVertical: 3,
    marginVertical: 3,
  },
  grandSummaryLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#111827",
  },
  grandSummaryVal: {
    fontSize: 11.5,
    fontWeight: "900",
    color: "#111827",
  },
  signatoryBlock: {
    alignItems: "flex-end",
    marginTop: 14,
  },
  signForLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  signImage: {
    width: 80,
    height: 32,
    marginBottom: 2,
  },
  signSpace: {
    height: 24,
  },
  signUnderline: {
    width: 110,
    borderTopWidth: 1,
    borderColor: "#111827",
    marginBottom: 2,
  },
  signatoryDesignation: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#374151",
  },

  // ── Actions ────────────────────────────────────────────────────────
  actions: { gap: 10, marginTop: 4 },
  btnRow: {
    flexDirection: "row",
    gap: 12,
  },
});
