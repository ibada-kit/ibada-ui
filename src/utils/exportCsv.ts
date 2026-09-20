import type { SponsorshipRecord, Donation } from '../types';

/**
 * Exports a detailed list of sponsorship records to a formatted CSV file.
 * Compatible with Excel, Google Sheets, and LibreOffice with UTF-8 BOM encoding.
 */
export function exportSponsorshipsToCSV(
  sponsorships: SponsorshipRecord[],
  filenamePrefix: string = 'sponsorships_detailed_report'
) {
  if (!sponsorships || sponsorships.length === 0) {
    alert('No sponsorship records found to export.');
    return;
  }

  // 21 Comprehensive detail headers
  const headers = [
    'Sl No',
    'Receipt Token',
    'Date & Time',
    'Sponsoring Firm / Donor',
    'Contact Person',
    'Mobile Number',
    'Item Name',
    'Unit Price (INR)',
    'Quantity Sponsored',
    'Total Committed (INR)',
    'Amount Paid (INR)',
    'Balance Amount (INR)',
    'Payment Status',
    'Payment Option',
    'Payment Mode',
    'Transaction Ref',
    'Ward Number',
    'Panchayath',
    'Collected By',
    'Collector Role',
    'Notes'
  ];

  const formatCell = (val: any): string => {
    if (val === null || val === undefined) return '""';
    let str = String(val).trim();
    // Neutralize formula injection triggers for spreadsheet applications (=, +, -, @, tab, CR)
    if (/^[=+\-@\t\r]/.test(str)) {
      str = "'" + str;
    }
    return `"${str.replace(/"/g, '""')}"`;
  };

  let totalQty = 0;
  let totalCommitted = 0;
  let totalPaid = 0;
  let totalBalance = 0;

  const rows = sponsorships.map((s, index) => {
    const qty = Number(s.quantity) || 1;
    const committed = Number(s.totalAmount) || 0;
    const paid = Number(s.amountPaid) || 0;
    const bal = Number(s.balanceAmount) || 0;

    totalQty += qty;
    totalCommitted += committed;
    totalPaid += paid;
    totalBalance += bal;

    let formattedDate = s.createdDate || '';
    try {
      if (formattedDate) {
        const d = new Date(formattedDate);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      }
    } catch {
      // keep raw string
    }

    return [
      index + 1,
      formatCell(s.receiptToken),
      formatCell(formattedDate),
      formatCell(s.donorName),
      formatCell(s.contactPerson || '-'),
      formatCell(s.mobileNumber || '-'),
      formatCell(s.itemName || 'Standard Package'),
      s.itemPrice || (qty > 0 ? committed / qty : 0),
      qty,
      committed,
      paid,
      bal,
      formatCell(s.paymentStatus || (bal <= 0 ? 'Completed' : paid > 0 ? 'Partial' : 'Booked')),
      formatCell(s.paymentOption || '-'),
      formatCell(s.paymentMode || 'Cash'),
      formatCell(s.transactionReference || '-'),
      s.wardNumber || '-',
      formatCell(s.panchayath || 'Madavoor'),
      formatCell(s.collectedByName || '-'),
      formatCell(s.collectedByRole || '-'),
      formatCell(s.notes || '-')
    ].join(',');
  });

  // Summary row at the bottom with aggregates
  const summaryRow = [
    '""',
    '"TOTALS"',
    '""',
    `"${sponsorships.length} Sponsors"`,
    '""',
    '""',
    '""',
    '""',
    totalQty,
    totalCommitted,
    totalPaid,
    totalBalance,
    '""',
    '""',
    '""',
    '""',
    '""',
    '""',
    '""',
    '""',
    '""'
  ].join(',');

  // UTF-8 BOM (\uFEFF) ensures Excel correctly recognizes UTF-8 formatting and symbols
  const csvString = '\uFEFF' + [headers.join(','), ...rows, summaryRow].join('\r\n');

  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const today = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `${filenamePrefix}_${today}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports a detailed list of kit donation records to a formatted CSV file.
 * Includes payment options (PayFull, Advance, Book), amount paid, and balance details.
 */
export function exportDonationsToCSV(
  donations: Donation[],
  filenamePrefix: string = 'kit_donations_detailed_report'
) {
  if (!donations || donations.length === 0) {
    alert('No donation records found to export.');
    return;
  }

  const headers = [
    'Sl No',
    'Receipt Token',
    'Serial Number',
    'Date & Time',
    'Donor Name',
    'WhatsApp Number',
    'Kit Count',
    'Total Amount (INR)',
    'Amount Paid (INR)',
    'Balance Amount (INR)',
    'Payment Status',
    'Payment Option',
    'Payment Mode',
    'Transaction Ref',
    'Ward Number',
    'Panchayath',
    'Collected By',
    'Collector Role',
    'Notes'
  ];

  const formatCell = (val: any): string => {
    if (val === null || val === undefined) return '""';
    let str = String(val).trim();
    if (/^[=+\-@\t\r]/.test(str)) {
      str = "'" + str;
    }
    return `"${str.replace(/"/g, '""')}"`;
  };

  let totalKits = 0;
  let totalCommitted = 0;
  let totalPaid = 0;
  let totalBalance = 0;

  const rows = donations.map((d, index) => {
    const kits = Number(d.kitCount) || 1;
    const committed = Number(d.totalAmount) || 0;
    const paid = Number(d.amountPaid !== undefined ? d.amountPaid : d.totalAmount) || 0;
    const bal = Number(d.balanceAmount !== undefined ? d.balanceAmount : Math.max(0, committed - paid)) || 0;

    totalKits += kits;
    totalCommitted += committed;
    totalPaid += paid;
    totalBalance += bal;

    let formattedDate = d.timestamp || '';
    try {
      if (formattedDate) {
        const dt = new Date(formattedDate);
        if (!isNaN(dt.getTime())) {
          formattedDate = dt.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      }
    } catch {
      // keep raw string
    }

    return [
      index + 1,
      formatCell(d.receiptToken),
      d.serialNumber || '-',
      formatCell(formattedDate),
      formatCell(d.donorName),
      formatCell(d.whatsAppNumber || '-'),
      kits,
      committed,
      paid,
      bal,
      formatCell(d.paymentStatus || (bal <= 0 ? 'Completed' : paid > 0 ? 'Partial' : 'Booked')),
      formatCell(d.paymentOption || 'PayFull'),
      formatCell(d.paymentMode || 'Cash'),
      formatCell(d.transactionReference || '-'),
      d.wardNumber || '-',
      formatCell(d.panchayath || 'Madavoor'),
      formatCell(d.collectedByName || '-'),
      formatCell(d.collectedByRole || '-'),
      formatCell(d.notes || '-')
    ].join(',');
  });

  const summaryRow = [
    '""',
    '"TOTALS"',
    '""',
    '""',
    `"${donations.length} Donors"`,
    '""',
    totalKits,
    totalCommitted,
    totalPaid,
    totalBalance,
    '""',
    '""',
    '""',
    '""',
    '""',
    '""',
    '""',
    '""',
    '""'
  ].join(',');

  const csvString = '\uFEFF' + [headers.join(','), ...rows, summaryRow].join('\r\n');

  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const today = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `${filenamePrefix}_${today}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
