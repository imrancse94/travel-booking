import { renderHeader } from './partials/header.js';
import { renderFooter } from './partials/footer.js';

// Every outgoing email is wrapped in this single layout, so branding
// (organization name/logo) and footer copy only ever need to change in one place.
export function renderLayout({ title, bodyHtml, agencyName = 'Global Travel Agency', logoUrl = null }) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
            ${renderHeader({ agencyName, logoUrl })}
            <tr>
              <td style="padding:32px;">
                <h2 style="color:#111827;margin-top:0;">${title}</h2>
                ${bodyHtml}
              </td>
            </tr>
            ${renderFooter({ agencyName })}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
