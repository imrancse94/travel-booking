export function refundProcessed({ firstName, amount, currency, bookingNumber }) {
  return {
    subject: `Refund Processed - ${bookingNumber}`,
    title: 'Refund processed',
    bodyHtml: `<p>Hi ${firstName}, a refund of ${currency} ${amount} has been processed for booking ${bookingNumber}.</p>`,
  };
}
