import { ValidationError } from '../utils/errors.js';

// Wraps a Zod schema. Usage: validate({ body: schema, query: schema, params: schema })
export function validate(schemas) {
  return function validationMiddleware(req, res, next) {
    const errors = [];

    for (const key of ['params', 'query', 'body']) {
      const schema = schemas[key];
      if (!schema) continue;

      const result = schema.safeParse(req[key]);
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({ field: `${key}.${issue.path.join('.')}`, message: issue.message });
        }
      } else {
        req[key] = result.data;
      }
    }

    if (errors.length > 0) {
      return next(new ValidationError('Validation failed', errors));
    }

    next();
  };
}
