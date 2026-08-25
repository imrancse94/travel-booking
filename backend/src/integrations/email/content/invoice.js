export function invoice({ firstName, invoiceNumber }) {
  return {
    subject: `Invoice ${invoiceNumber}`,
    title: 'Your invoice',
    bodyHtml: `<p>Hi ${firstName}, please find invoice ${invoiceNumber} attached.</p>`,
  };
}
