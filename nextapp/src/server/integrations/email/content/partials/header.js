export function renderHeader({ agencyName, logoUrl }) {
  const brandMark = logoUrl
    ? `<img src="${logoUrl}" alt="${agencyName}" height="32" style="height:32px;display:block;" />`
    : `<span style="font-size:18px;font-weight:700;color:#111827;">${agencyName}</span>`;

  return `
  <tr>
    <td style="padding:24px 32px;border-bottom:1px solid #e5e7eb;">
      ${brandMark}
    </td>
  </tr>`;
}
