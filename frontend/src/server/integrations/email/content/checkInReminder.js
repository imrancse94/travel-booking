export function checkInReminder({ firstName, hotelName, checkIn }) {
  return {
    subject: 'Upcoming check-in reminder',
    title: 'See you soon!',
    bodyHtml: `<p>Hi ${firstName}, this is a reminder that your check-in at ${hotelName} is on ${checkIn}.</p>`,
  };
}
