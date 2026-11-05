export function bookingCancellation({ firstName, bookingNumber, refundableAmount, currency }) {
  return {
    subject: `Booking Cancelled - ${bookingNumber}`,
    title: 'Booking cancelled',
    bodyHtml: `<p>Hi ${firstName}, your booking <strong>${bookingNumber}</strong> has been cancelled.</p>
       <p>Refundable amount: ${currency} ${refundableAmount ?? 0}</p>`,
  };
}
