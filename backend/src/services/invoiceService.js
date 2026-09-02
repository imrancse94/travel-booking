import fs from 'node:fs/promises';
import path from 'node:path';
import { db } from '../db/index.js';
import { invoiceItems, invoices } from '../db/schema.js';
import { env } from '../config/env.js';
import { NotFoundError } from '../utils/errors.js';
import { Money } from '../utils/money.js';
import { generateInvoiceNumber } from '../utils/bookingNumber.js';
import { getSettings } from './settingsService.js';
import { recordAudit } from './auditService.js';
import { PdfBuilder } from '../lib/PdfBuilder.js';
import * as invoiceRepository from '../repositories/invoiceRepository.js';

export async function listInvoices(query) {
  const { items, total } = await invoiceRepository.list(query);
  return { items, total };
}

export async function getInvoice(id) {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) throw new NotFoundError('Invoice not found');
  return invoice;
}

/**
 * Builds an Invoice + InvoiceItem rows straight from a booking's own stored
 * amounts (rooms, services, discount, tax, totals) -- pricing is never
 * re-derived here, only summarized into line items.
 */
export async function generateInvoiceForBooking(bookingId, actorId) {
  const booking = await db.query.bookings.findFirst({
    where: (b, { eq }) => eq(b.id, bookingId),
    with: {
      bookingRooms: { with: { roomType: true } },
      services: { with: { service: true } },
      hotel: true,
      customer: true,
    },
  });
  if (!booking) throw new NotFoundError('Booking not found');

  const itemsData = [];
  for (const bookingRoom of booking.bookingRooms) {
    itemsData.push({
      description: `${bookingRoom.roomType?.name || 'Room'} - ${bookingRoom.nights} night${bookingRoom.nights === 1 ? '' : 's'}`,
      quantity: bookingRoom.nights,
      unitPrice: new Money(bookingRoom.ratePerNight).toString(),
      total: new Money(bookingRoom.totalPrice).toString(),
    });
  }
  for (const bookingService of booking.services) {
    itemsData.push({
      description: bookingService.service?.name || 'Service',
      quantity: bookingService.quantity,
      unitPrice: new Money(bookingService.price).toString(),
      total: new Money(bookingService.total).toString(),
    });
  }

  const subtotal = new Money(booking.subtotal);
  const discountAmount = new Money(booking.discountAmount);
  const taxAmount = new Money(booking.taxAmount);
  const totalAmount = new Money(booking.totalAmount);
  const paidAmount = new Money(booking.paidAmount);
  const dueAmount = new Money(booking.dueAmount);

  let status = 'unpaid';
  if (totalAmount.greaterThan(0) && paidAmount.greaterThanOrEqualTo(totalAmount)) {
    status = 'paid';
  } else if (paidAmount.greaterThan(0)) {
    status = 'partially_paid';
  }

  const invoice = await db.transaction(async (tx) => {
    const invoiceNumber = await generateInvoiceNumber(tx);
    const [created] = await tx
      .insert(invoices)
      .values({
        invoiceNumber,
        bookingId,
        subtotal: subtotal.toString(),
        discountAmount: discountAmount.toString(),
        taxAmount: taxAmount.toString(),
        totalAmount: totalAmount.toString(),
        paidAmount: paidAmount.toString(),
        dueAmount: dueAmount.toString(),
        currency: booking.currency,
        status,
      })
      .returning();

    // Prisma nested these under the invoice; Drizzle inserts them separately,
    // still inside the transaction that reserved the invoice number.
    if (itemsData.length) {
      await tx.insert(invoiceItems).values(itemsData.map((i) => ({ ...i, invoiceId: created.id })));
    }
    return created;
  });

  await recordAudit({
    userId: actorId,
    action: 'invoice.created',
    entity: 'Invoice',
    entityId: invoice.id,
    newValue: { bookingId, invoiceNumber: invoice.invoiceNumber, totalAmount: invoice.totalAmount.toString() },
  });

  return getInvoice(invoice.id);
}

function fmt(value, currency) {
  return `${currency} ${new Money(value ?? 0).toFixed(2)}`;
}

function buildInvoicePdfBuffer(invoice, settings) {
  const booking = invoice.booking;
  const builder = new PdfBuilder();

  builder.heading(settings.agency_name || 'Global Travel Agency', { size: 18 });
  if (settings.agency_address) {
    builder.font('Helvetica').fontSize(9).fillColor('#6b7280').text(settings.agency_address);
  }
  builder.moveDown(1);

  builder.font('Helvetica-Bold').fontSize(16).fillColor('#111827').text('INVOICE');
  builder.font('Helvetica').fontSize(10).fillColor('#374151');
  builder.text(`Invoice #: ${invoice.invoiceNumber}`);
  builder.text(`Issued: ${new Date(invoice.issuedAt).toISOString().slice(0, 10)}`);
  builder.text(`Status: ${invoice.status}`);
  builder.moveDown(0.5);
  builder.text(`Booking #: ${booking.bookingNumber}`);
  builder.text(`Hotel: ${booking.hotel?.name || ''}`);
  builder.text(
    `Check-in: ${new Date(booking.checkIn).toISOString().slice(0, 10)}  Check-out: ${new Date(booking.checkOut)
      .toISOString()
      .slice(0, 10)}`
  );
  builder.moveDown(1);

  builder.font('Helvetica-Bold').text('Bill To');
  builder.font('Helvetica').text(`${booking.customer.firstName} ${booking.customer.lastName}`);
  if (booking.customer.email) builder.text(booking.customer.email);
  if (booking.customer.phone) builder.text(booking.customer.phone);
  builder.moveDown(1);
  builder.hr();

  builder.row(
    [
      { text: 'Description', width: 260 },
      { text: 'Qty', width: 60, align: 'right' },
      { text: 'Unit Price', width: 100, align: 'right' },
      { text: 'Total', width: 100, align: 'right' },
    ],
    { bold: true }
  );
  builder.hr();

  for (const item of invoice.items) {
    builder.row([
      { text: item.description, width: 260 },
      { text: String(item.quantity), width: 60, align: 'right' },
      { text: fmt(item.unitPrice, invoice.currency), width: 100, align: 'right' },
      { text: fmt(item.total, invoice.currency), width: 100, align: 'right' },
    ]);
  }

  builder.moveDown(0.5);
  builder.hr();

  const totalsRow = (label, value, options = {}) =>
    builder.row(
      [
        { text: '', width: 320 },
        { text: label, width: 100, align: 'right' },
        { text: fmt(value, invoice.currency), width: 100, align: 'right' },
      ],
      options
    );

  totalsRow('Subtotal', invoice.subtotal);
  totalsRow('Discount', invoice.discountAmount);
  totalsRow('Tax', invoice.taxAmount);
  totalsRow('Total', invoice.totalAmount, { bold: true });
  totalsRow('Paid', invoice.paidAmount);
  totalsRow('Due', invoice.dueAmount, { bold: true });

  return builder.toBuffer();
}

/**
 * Renders the invoice PDF. In local file-storage mode it also persists the
 * file under uploads/invoices/ and stores the relative path on
 * invoice.pdfUrl; otherwise the buffer is only returned (no S3 upload here --
 * that belongs to the uploads module).
 */
export async function getInvoicePdf(id) {
  const invoice = await getInvoice(id);
  const settings = await getSettings();
  const buffer = await buildInvoicePdfBuffer(invoice, settings);

  if (env.fileStorageDriver === 'local') {
    const dir = path.join(process.cwd(), 'uploads', 'invoices');
    await fs.mkdir(dir, { recursive: true });
    const fileName = `${invoice.invoiceNumber}.pdf`;
    await fs.writeFile(path.join(dir, fileName), buffer);

    const relativeUrl = path.posix.join('uploads', 'invoices', fileName);
    await invoiceRepository.updatePdfUrl(id, relativeUrl);
    invoice.pdfUrl = relativeUrl;
  }

  return { buffer, invoice };
}
