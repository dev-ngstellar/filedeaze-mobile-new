export const APP_CONFIG = {
  // Production credentials
  tenantId: "5c9a1ec2-399b-4393-ac40-ba1ea5417de6",
  tenantCode: "avanthikasolutions",
  appName: "Avanthika solutions Ltd",

  // local data for development purpose use the below credentials
  //tenantId: "8c950efc-97fe-4409-a941-1684b46e3ed9",
  //tenantCode: "abcservicepvtltd001",
  //appName: "ABC service pvt ltd",

  // Live Production API URL
  apiBaseUrl: process.env.EXPO_PUBLIC_API_URL || "https://api-fieldeaze.ngstellar.com/api/v1",
  timeoutMs: 15000,
};
