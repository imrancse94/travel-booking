import { ConflictError, NotFoundError } from '../utils/errors.js';
import * as customerRepository from '../repositories/customerRepository.js';
import { recordAudit } from './auditService.js';

export async function listCustomers(query) {
  const { items, total } = await customerRepository.list(query);
  return { items, total };
}

export async function getCustomer(id) {
  const customer = await customerRepository.findById(id);
  if (!customer) throw new NotFoundError('Customer not found');
  return customer;
}

export async function createCustomer(data, actorId) {
  const existing = await customerRepository.findByEmail(data.email);
  if (existing) throw new ConflictError('A customer with this email already exists');

  const customer = await customerRepository.create(data);
  await recordAudit({
    userId: actorId,
    action: 'customer.created',
    entity: 'Customer',
    entityId: customer.id,
    newValue: { email: customer.email },
  });
  return customer;
}

export async function updateCustomer(id, data, actorId) {
  const existing = await customerRepository.findById(id);
  if (!existing) throw new NotFoundError('Customer not found');

  if (data.email && data.email !== existing.email) {
    const emailOwner = await customerRepository.findByEmail(data.email);
    if (emailOwner && emailOwner.id !== id) throw new ConflictError('A customer with this email already exists');
  }

  const updated = await customerRepository.update(id, data);
  await recordAudit({
    userId: actorId,
    action: 'customer.updated',
    entity: 'Customer',
    entityId: id,
    oldValue: existing,
    newValue: data,
  });
  return updated;
}

export async function deleteCustomer(id, actorId) {
  const existing = await customerRepository.findById(id);
  if (!existing) throw new NotFoundError('Customer not found');

  await customerRepository.softDelete(id);
  await recordAudit({ userId: actorId, action: 'customer.deleted', entity: 'Customer', entityId: id });
}

export async function listDocuments(customerId) {
  await getCustomer(customerId);
  return customerRepository.listDocuments(customerId);
}

export async function addDocument(customerId, { type, fileUrl }, actorId) {
  await getCustomer(customerId);
  const document = await customerRepository.addDocument(customerId, { type, fileUrl });
  await recordAudit({
    userId: actorId,
    action: 'customer.document.added',
    entity: 'CustomerDocument',
    entityId: document.id,
    newValue: { customerId, type },
  });
  return document;
}

export async function removeDocument(customerId, documentId, actorId) {
  const document = await customerRepository.findDocument(customerId, documentId);
  if (!document) throw new NotFoundError('Document not found');

  await customerRepository.removeDocument(documentId);
  await recordAudit({
    userId: actorId,
    action: 'customer.document.removed',
    entity: 'CustomerDocument',
    entityId: documentId,
    oldValue: { customerId, type: document.type },
  });
}

export async function getBookingHistory(customerId, query) {
  await getCustomer(customerId);
  const { items, total } = await customerRepository.listBookingsForCustomer(customerId, query);
  return { items, total };
}

export async function getPaymentHistory(customerId, query) {
  await getCustomer(customerId);
  const { items, total } = await customerRepository.listPaymentsForCustomer(customerId, query);
  return { items, total };
}
