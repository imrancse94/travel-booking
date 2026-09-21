// Kept as a compatibility re-export. The actual content now lives under
// ./content/ -- one file per email, with a shared layout/header/footer
// (see ./content/layout.js) so branding only needs to change in one place.
export { emailContent as emailTemplates } from './content/index.js';
