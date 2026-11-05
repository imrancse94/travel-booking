export function renderFooter({ agencyName }) {
  const year = new Date().getFullYear();
  return `
  <tr>
    <td style="padding:20px 32px;border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">
        &copy; ${year} ${agencyName}. This is an automated message, please do not reply.
      </p>
    </td>
  </tr>`;
}
