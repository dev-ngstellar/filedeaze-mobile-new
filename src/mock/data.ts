export type TicketStatus =
  | "NEW"
  | "ASSIGNED"
  | "ACCEPTED"
  | "TRAVELLING"
  | "REACHED"
  | "IN_PROGRESS"
  | "PENDING"
  | "RESCHEDULED"
  | "COMPLETED"
  | "CLOSED";

export type TicketPriority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";

export interface Ticket {
  ticketNo: string;
  customerName: string;
  customerMobile: string;
  service: string;
  description: string;
  status: TicketStatus;
  priority?: TicketPriority;
  scheduledDate: string;
  scheduledTime: string;
  address: string;
  technicianName?: string;
  technicianMobile?: string;
  notes?: string;
  
  // Completion Flow Fields
  beforePhotos?: string[];
  afterPhotos?: string[];
  customerSignature?: string;
  workNotes?: string;
  duration?: string;
  paymentCollection?: number;
  paymentMethod?: string;
  nextVisitDate?: string;
  pendingReason?: string;
  
  // Customer-raised ticket fields
  category?: string;
  subCategory?: string;
  images?: string[];
}

export interface Invoice {
  invoiceNo: string;
  ticketNo: string;
  amount: number;
  gst: number;
  total: number;
  paymentStatus: "PAID" | "UNPAID";
}

export interface AttendanceLog {
  checkedIn: boolean;
  checkInTime?: string;
  checkInLocation?: string;
  checkOutTime?: string;
  workingHours?: string;
}

export type AttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY" | "LATE";

export interface AttendanceRecord {
  id: string;
  date: string;           // YYYY-MM-DD
  checkInTime?: string;   // HH:MM AM/PM
  checkOutTime?: string;  // HH:MM AM/PM
  workingHours?: string;  // e.g. "8h 15m"
  location?: string;
  status: AttendanceStatus;
}

// 1. Mock Technician Profile
export const MOCK_TECHNICIAN = {
  id: 1,
  name: "John Technician",
  mobile: "9876543210",
  role: "TECHNICIAN" as const,
  email: "john.tech@fieldeaze.com",
};

// 2. Mock Customer Profile
export const MOCK_CUSTOMER = {
  id: 101,
  name: "Raj Kumar",
  mobile: "9876543210",
  role: "CUSTOMER" as const,
};

// 3. Centralized Mock Ticket Database
export let MOCK_TICKETS: Ticket[] = [
  {
    ticketNo: "FE-2026-001",
    customerName: "Priya Sharma",
    customerMobile: "9811001100",
    service: "AC Servicing - Deep Clean",
    description: "Customer reporting loud noise from split AC, filter cleaning overdue by 3 months.",
    status: "ASSIGNED",
    priority: "HIGH",
    scheduledDate: "2026-06-12",
    scheduledTime: "10:00 AM - 12:00 PM",
    address: "B-45, Vasant Kunj, New Delhi - 110070",
    technicianName: "John Technician",
  },
  {
    ticketNo: "FE-2026-002",
    customerName: "Arjun Mehta",
    customerMobile: "9822002200",
    service: "Electrical - Wiring Inspection",
    description: "Flickering lights in master bedroom and kitchen. Possible short circuit.",
    status: "ACCEPTED",
    priority: "URGENT",
    scheduledDate: "2026-06-12",
    scheduledTime: "02:00 PM - 04:00 PM",
    address: "C-12, DLF Phase 2, Gurgaon - 122002",
    technicianName: "John Technician",
  },
  {
    ticketNo: "FE-2026-003",
    customerName: "Sunita Batra",
    customerMobile: "9833003300",
    service: "Plumbing - Pipe Leak Fix",
    description: "Bathroom sink pipe leaking, water pooling under cabinet.",
    status: "IN_PROGRESS",
    priority: "HIGH",
    scheduledDate: "2026-06-11",
    scheduledTime: "09:00 AM - 11:00 AM",
    address: "H-7, Sector 18, Noida - 201301",
    technicianName: "John Technician",
  },
  {
    ticketNo: "FE-2026-004",
    customerName: "Ramesh Gupta",
    customerMobile: "9844004400",
    service: "Refrigerator - Cooling Issue",
    description: "Fridge not cooling below 10°C. Gas refill suspected.",
    status: "PENDING",
    priority: "MEDIUM",
    scheduledDate: "2026-06-10",
    scheduledTime: "11:00 AM - 01:00 PM",
    address: "12, Rajouri Garden, New Delhi - 110027",
    technicianName: "John Technician",
    pendingReason: "Spare compressor part unavailable. Ordered from supplier.",
  },
  {
    ticketNo: "FE-2026-005",
    customerName: "Kavitha Nair",
    customerMobile: "9855005500",
    service: "Washing Machine - Drum Noise",
    description: "Samsung front-load washing machine making grinding noise during spin cycle.",
    status: "COMPLETED",
    priority: "MEDIUM",
    scheduledDate: "2026-06-09",
    scheduledTime: "10:00 AM - 12:00 PM",
    address: "301, Indiranagar, Bengaluru - 560038",
    technicianName: "John Technician",
    workNotes: "Replaced drum bearings and belt. Tested 3 cycles. Issue resolved.",
    duration: "2h 30m",
    paymentCollection: 2800,
    paymentMethod: "UPI",
  },
  {
    ticketNo: "FE-2026-006",
    customerName: "Deepak Joshi",
    customerMobile: "9866006600",
    service: "CCTV - Camera Installation",
    description: "Install 4 HD cameras, DVR setup for 2BHK flat entrance and balcony.",
    status: "ASSIGNED",
    priority: "LOW",
    scheduledDate: "2026-06-13",
    scheduledTime: "03:00 PM - 06:00 PM",
    address: "F-21, Mayur Vihar Phase 1, Delhi - 110091",
    technicianName: "John Technician",
  },
  {
    ticketNo: "FE-2026-007",
    customerName: "Meena Krishnan",
    customerMobile: "9877007700",
    service: "Water Purifier - Filter Change",
    description: "RO filter needs annual replacement. TDS reading 450 ppm.",
    status: "TRAVELLING",
    priority: "LOW",
    scheduledDate: "2026-06-12",
    scheduledTime: "04:00 PM - 05:30 PM",
    address: "A-402, Hiranandani Gardens, Mumbai - 400076",
    technicianName: "John Technician",
  },
  {
    ticketNo: "FE-2026-008",
    customerName: "Ajay Verma",
    customerMobile: "9888008800",
    service: "AC Installation - Window Unit",
    description: "New 1.5 ton window AC installation on 2nd floor wall.",
    status: "RESCHEDULED",
    priority: "MEDIUM",
    scheduledDate: "2026-06-14",
    scheduledTime: "10:00 AM - 01:00 PM",
    address: "56, Lajpat Nagar II, New Delhi - 110024",
    technicianName: "John Technician",
    nextVisitDate: "2026-06-14",
  },
  {
    ticketNo: "FE-2026-009",
    customerName: "Rekha Pillai",
    customerMobile: "9899009900",
    service: "Microwave - Not Heating",
    description: "LG microwave oven stops after 20 seconds without heating food.",
    status: "COMPLETED",
    priority: "LOW",
    scheduledDate: "2026-05-30",
    scheduledTime: "02:00 PM - 03:30 PM",
    address: "23, Koramangala 6th Block, Bengaluru - 560095",
    technicianName: "John Technician",
    workNotes: "Replaced magnetron assembly. Tested all power levels.",
    duration: "1h 45m",
    paymentCollection: 1850,
    paymentMethod: "Cash",
  },
  {
    ticketNo: "FE-2026-010",
    customerName: "Suresh Rao",
    customerMobile: "9810101010",
    service: "Inverter - Battery Backup Low",
    description: "Luminous inverter giving only 30 min backup instead of 4 hours.",
    status: "COMPLETED",
    priority: "HIGH",
    scheduledDate: "2026-05-28",
    scheduledTime: "11:00 AM - 01:00 PM",
    address: "78, Rohini Sector 10, New Delhi - 110085",
    technicianName: "John Technician",
    workNotes: "Replaced 2 dead battery cells. Charged and tested backup.",
    duration: "2h 00m",
    paymentCollection: 4500,
    paymentMethod: "Card",
  },
  {
    ticketNo: "FE-2026-011",
    customerName: "Lakshmi Devi",
    customerMobile: "9821212121",
    service: "Geyser - No Hot Water",
    description: "Racold 25L geyser not heating. Thermostat failure suspected.",
    status: "REACHED",
    priority: "HIGH",
    scheduledDate: "2026-06-12",
    scheduledTime: "01:00 PM - 02:30 PM",
    address: "14, Anna Nagar East, Chennai - 600102",
    technicianName: "John Technician",
  },
  {
    ticketNo: "FE-2026-012",
    customerName: "Vikram Singh",
    customerMobile: "9832323232",
    service: "Home Automation - Smart Switch",
    description: "Install 4 smart Wi-Fi switches for bedroom and living room lights.",
    status: "ASSIGNED",
    priority: "MEDIUM",
    scheduledDate: "2026-06-15",
    scheduledTime: "10:00 AM - 12:00 PM",
    address: "G-5, Greenwood City, Sector 45, Gurgaon - 122003",
    technicianName: "John Technician",
  },
];


// 4. Centralized Mock Invoice Database
export let MOCK_INVOICES: Invoice[] = [];

// 5. Centralized Attendance State
export let MOCK_ATTENDANCE: AttendanceLog = {
  checkedIn: false,
};

// 6. Attendance History (30 records)
export const MOCK_ATTENDANCE_HISTORY: AttendanceRecord[] = [
  { id: "ATT-001", date: "2026-06-11", checkInTime: "09:02 AM", checkOutTime: "06:18 PM", workingHours: "9h 16m", location: "Coimbatore, Tamil Nadu", status: "PRESENT" },
  { id: "ATT-002", date: "2026-06-10", checkInTime: "09:45 AM", checkOutTime: "06:00 PM", workingHours: "8h 15m", location: "Branch Office", status: "LATE" },
  { id: "ATT-003", date: "2026-06-09", checkInTime: "08:55 AM", checkOutTime: "05:55 PM", workingHours: "9h 00m", location: "Client Site - Noida 18", status: "PRESENT" },
  { id: "ATT-004", date: "2026-06-08", status: "ABSENT" },
  { id: "ATT-005", date: "2026-06-07", status: "ABSENT" },
  { id: "ATT-006", date: "2026-06-06", checkInTime: "09:10 AM", checkOutTime: "01:30 PM", workingHours: "4h 20m", location: "Remote", status: "HALF_DAY" },
  { id: "ATT-007", date: "2026-06-05", checkInTime: "09:00 AM", checkOutTime: "06:00 PM", workingHours: "9h 00m", location: "Coimbatore, Tamil Nadu", status: "PRESENT" },
  { id: "ATT-008", date: "2026-06-04", checkInTime: "09:05 AM", checkOutTime: "07:10 PM", workingHours: "10h 05m", location: "Branch Office", status: "PRESENT" },
  { id: "ATT-009", date: "2026-06-03", checkInTime: "09:30 AM", checkOutTime: "06:30 PM", workingHours: "9h 00m", location: "Client Site - Gurgaon", status: "PRESENT" },
  { id: "ATT-010", date: "2026-06-02", checkInTime: "08:50 AM", checkOutTime: "06:05 PM", workingHours: "9h 15m", location: "Coimbatore, Tamil Nadu", status: "PRESENT" },
  { id: "ATT-011", date: "2026-06-01", status: "ABSENT" },
  { id: "ATT-012", date: "2026-05-31", checkInTime: "09:15 AM", checkOutTime: "06:20 PM", workingHours: "9h 05m", location: "Branch Office", status: "PRESENT" },
  { id: "ATT-013", date: "2026-05-30", checkInTime: "09:00 AM", checkOutTime: "06:00 PM", workingHours: "9h 00m", location: "Coimbatore, Tamil Nadu", status: "PRESENT" },
  { id: "ATT-014", date: "2026-05-29", checkInTime: "09:55 AM", checkOutTime: "06:00 PM", workingHours: "8h 05m", location: "Remote", status: "LATE" },
  { id: "ATT-015", date: "2026-05-28", checkInTime: "09:00 AM", checkOutTime: "01:00 PM", workingHours: "4h 00m", location: "Branch Office", status: "HALF_DAY" },
  { id: "ATT-016", date: "2026-05-27", status: "ABSENT" },
  { id: "ATT-017", date: "2026-05-26", checkInTime: "09:10 AM", checkOutTime: "06:10 PM", workingHours: "9h 00m", location: "Client Site - Noida 18", status: "PRESENT" },
  { id: "ATT-018", date: "2026-05-25", status: "ABSENT" },
  { id: "ATT-019", date: "2026-05-24", checkInTime: "09:00 AM", checkOutTime: "06:00 PM", workingHours: "9h 00m", location: "Coimbatore, Tamil Nadu", status: "PRESENT" },
  { id: "ATT-020", date: "2026-05-23", checkInTime: "09:02 AM", checkOutTime: "05:45 PM", workingHours: "8h 43m", location: "Branch Office", status: "PRESENT" },
  { id: "ATT-021", date: "2026-05-22", checkInTime: "09:00 AM", checkOutTime: "06:00 PM", workingHours: "9h 00m", location: "Client Site - Gurgaon", status: "PRESENT" },
  { id: "ATT-022", date: "2026-05-21", checkInTime: "10:15 AM", checkOutTime: "06:00 PM", workingHours: "7h 45m", location: "Remote", status: "LATE" },
  { id: "ATT-023", date: "2026-05-20", checkInTime: "09:05 AM", checkOutTime: "06:10 PM", workingHours: "9h 05m", location: "Coimbatore, Tamil Nadu", status: "PRESENT" },
  { id: "ATT-024", date: "2026-05-19", checkInTime: "09:00 AM", checkOutTime: "01:30 PM", workingHours: "4h 30m", location: "Branch Office", status: "HALF_DAY" },
  { id: "ATT-025", date: "2026-05-18", status: "ABSENT" },
  { id: "ATT-026", date: "2026-05-17", checkInTime: "09:00 AM", checkOutTime: "06:00 PM", workingHours: "9h 00m", location: "Coimbatore, Tamil Nadu", status: "PRESENT" },
  { id: "ATT-027", date: "2026-05-16", checkInTime: "09:20 AM", checkOutTime: "06:25 PM", workingHours: "9h 05m", location: "Client Site - Noida 18", status: "PRESENT" },
  { id: "ATT-028", date: "2026-05-15", checkInTime: "09:00 AM", checkOutTime: "06:00 PM", workingHours: "9h 00m", location: "Branch Office", status: "PRESENT" },
  { id: "ATT-029", date: "2026-05-14", status: "ABSENT" },
  { id: "ATT-030", date: "2026-05-13", checkInTime: "09:10 AM", checkOutTime: "06:15 PM", workingHours: "9h 05m", location: "Coimbatore, Tamil Nadu", status: "PRESENT" },
];

/**
 * Utility to map internal ticket status to Customer-Facing status names
 */
export const mapToCustomerStatus = (status: TicketStatus): string => {
  switch (status) {
    case "NEW":
      return "NEW";
    case "ASSIGNED":
      return "ASSIGNED";
    case "ACCEPTED":
      return "TECHNICIAN ASSIGNED";
    case "TRAVELLING":
    case "REACHED":
      return "TECHNICIAN EN ROUTE";
    case "IN_PROGRESS":
      return "WORK IN PROGRESS";
    case "PENDING":
      return "PENDING";
    case "RESCHEDULED":
      return "RESCHEDULED";
    case "COMPLETED":
      return "COMPLETED";
    case "CLOSED":
      return "CLOSED";
    default:
      return status;
  }
};
