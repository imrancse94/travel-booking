export function success(res, { data = null, message = 'OK', statusCode = 200, meta } = {}) {
  const body = { success: true, data, message };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

export function created(res, data, message = 'Created successfully') {
  return success(res, { data, message, statusCode: 201 });
}

export function paginated(res, { items, page, limit, total, message = 'OK' }) {
  return success(res, {
    data: items,
    message,
    meta: {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    },
  });
}

export function failure(res, { message = 'Something went wrong', statusCode = 500, errors = [] } = {}) {
  return res.status(statusCode).json({ success: false, message, errors });
}
