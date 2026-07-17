export type AuthStackParamList = {
  Login: { email?: string; successBanner?: boolean } | undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email?: string; token?: string };
  OtpVerification: {
    email: string;
    mobile?: string;
    mode: "register" | "forgot_password";
    name?: string;
    password?: string;
    address?: string;
    tenantId?: string;
  };
};

import { Address } from "../services/customer.service";

export type CustomerStackParamList = {
  PostLoginSplash: undefined;
  CustomerHome: undefined;
  CustomerJobDetails: { jobId: string };
  CustomerDashboard: undefined;
  RaiseTicket:
    | { categoryId?: string; categoryName?: string; assetId?: string; assetName?: string }
    | undefined;
  TicketHistory: undefined;
  CustomerTicketDetails: { ticketId: string };
  LiveTracking: { ticketId: string; ticketNumber?: string; hasFeedback?: boolean };
  PaymentHistory: undefined;
  InvoiceList: undefined;
  InvoiceDetails: { invoiceId: string };
  Feedback: { ticketId: string; ticketNumber: string };
  AddressBook: { onSelectAddress?: (address: Address) => void; selectedAddressId?: string } | undefined;
  NotificationList: undefined;
  CustomerAssets: undefined;
  MyAmc: undefined;
  AmcDetails: { subscriptionId: string };
};

export type TechnicianStackParamList = {
  PostLoginSplash: undefined;
  TechnicianHome: undefined;
  TechnicianJobDetails: { jobId: string; openCompleteJob?: boolean; openMarkPending?: boolean };
  TechnicianInvoiceList: undefined;
  // Batch 1 — List Screens
  AttendanceHistory: undefined;
  AssignedJobs: { initialTab?: "ALL" | "ASSIGNED" | "ACCEPTED" | "IN_PROGRESS" | "PENDING" | "COMPLETED" } | undefined;
  // Workflow Integration Screens
  CheckIn: undefined;
  CheckOut: undefined;
  TravelTracking: { jobId: string; ticketNo: string; address: string };
  WorkTimer: { jobId: string; ticketNo: string };
  InvoiceGenerate: { jobId: string; ticketNo: string; amount: number; paymentMethod: string; invoiceNo: string; invoiceSubtotal?: number; invoiceGstAmount?: number; invoiceGstPercent?: number; invoiceTotal?: number; invoiceGeneratedAt?: string };
  ShareInvoice: { jobId: string; ticketNo: string; invoiceNo: string; customerMobile?: string; customerEmail?: string };
  NotificationList: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  CustomerPortal: undefined;
  TechnicianPortal: undefined;
};
