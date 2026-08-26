// Single place for Ask Teacha's payment + support contact details.
// Change these values here only — nothing else in the app hard-codes them.

export const PAYMENT_CONFIG = {
  bankName: "[BANK_NAME]",
  accountName: "[ACCOUNT_NAME]",
  accountNumber: "[ACCOUNT_NUMBER]",
  /** International format, digits only, no "+" — e.g. 2348012345678 */
  whatsappNumber: "[ASK_TEACHER_WHATSAPP_NUMBER]",
  currency: "₦",
};

/** True once the real details have replaced the placeholders. */
export function paymentDetailsConfigured(): boolean {
  return !PAYMENT_CONFIG.whatsappNumber.startsWith("[");
}

export function formatNaira(amount: number): string {
  return `${PAYMENT_CONFIG.currency}${amount.toLocaleString("en-NG")}`;
}

export function whatsappReceiptLink(opts: {
  name: string;
  email: string;
  amount: number;
  planName: string;
}): string {
  const message =
    `Hello Ask Teacha. I have paid ${formatNaira(opts.amount)} for the ${opts.planName} plan. ` +
    `My Ask Teacha account name is ${opts.name || "(not set)"} and my email is ${opts.email}. ` +
    `I am sending my payment receipt for verification.`;
  const number = PAYMENT_CONFIG.whatsappNumber.replace(/\D/g, "");
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
