export function paymentReceipt({ firstName, amount, currency, bookingNumber }) {
  return {
    subject: `Payment Received - ${bookingNumber}`,
    title: 'Payment received',
    bodyHtml: `<p>Hi ${firstName}, we received your payment of ${currency} ${amount} for booking ${bookingNumber}.</p>`,
  };
}
