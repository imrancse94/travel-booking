export function bookingConfirmation({ firstName, bookingNumber, hotelName, checkIn, checkOut, totalAmount, currency }) {
  return {
    subject: `Booking Confirmed - ${bookingNumber}`,
    title: 'Booking confirmed',
    bodyHtml: `<p>Hi ${firstName}, your booking <strong>${bookingNumber}</strong> at <strong>${hotelName}</strong> is confirmed.</p>
       <p>Check-in: ${checkIn}<br/>Check-out: ${checkOut}<br/>Total: ${currency} ${totalAmount}</p>`,
  };
}
