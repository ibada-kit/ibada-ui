import React, { useState, useMemo } from 'react';
import type { SponsorshipRecord, SponsorshipItem } from '../types';
import { Package, PlusCircle, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { exportSponsorshipsToCSV } from '../utils/exportCsv';

interface SponsoredItemsSummaryViewProps {
  title: string;
  subtitle?: string;
  sponsorships: SponsorshipRecord[];
  catalogItems?: SponsorshipItem[];
  onViewReceipt?: (sponsorship: SponsorshipRecord) => void;
  onOpenPayBalance?: (sponsorship: SponsorshipRecord) => void;
  onOpenSponsorshipModal?: () => void;
}

export const SponsoredItemsSummaryView: React.FC<SponsoredItemsSummaryViewProps> = ({
  title,
  subtitle,
  sponsorships,
  catalogItems = [],
  onViewReceipt,
  onOpenPayBalance,
  onOpenSponsorshipModal
}) => {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Aggregated breakdown of sponsored items
  const itemsBreakdown = useMemo(() => {
    const map = new Map<string, {
      itemId?: string;
      itemName: string;
      itemPrice: number;
      description?: string;
      quantitySponsored: number;
      totalCommitted: number;
      totalPaid: number;
      totalBalance: number;
      sponsors: SponsorshipRecord[];
    }>();

    // 1. Seed with catalog items so every standard package is visible
    catalogItems.forEach(item => {
      const key = item.name.toLowerCase().trim();
      map.set(key, {
        itemId: item.itemId,
        itemName: item.name,
        itemPrice: item.itemPrice,
        description: item.description,
        quantitySponsored: 0,
        totalCommitted: 0,
        totalPaid: 0,
        totalBalance: 0,
        sponsors: []
      });
    });

    // 2. Aggregate actual recorded sponsorships
    sponsorships.forEach(s => {
      const key = (s.itemName || 'Custom Item').toLowerCase().trim();
      const existing = map.get(key) || {
        itemId: s.itemId,
        itemName: s.itemName || 'Custom Item',
        itemPrice: s.itemPrice || (s.quantity > 0 ? s.totalAmount / s.quantity : s.totalAmount),
        description: '',
        quantitySponsored: 0,
        totalCommitted: 0,
        totalPaid: 0,
        totalBalance: 0,
        sponsors: []
      };

      existing.quantitySponsored += Number(s.quantity) || 1;
      existing.totalCommitted += Number(s.totalAmount) || 0;
      existing.totalPaid += Number(s.amountPaid) || 0;
      existing.totalBalance += Number(s.balanceAmount) || 0;
      existing.sponsors.push(s);

      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.quantitySponsored - a.quantitySponsored || b.totalPaid - a.totalPaid);
  }, [catalogItems, sponsorships]);

  // Overall totals
  const overallTotals = useMemo(() => {
    const totalItems = sponsorships.reduce((sum, s) => sum + (Number(s.quantity) || 1), 0);
    const totalCommitted = sponsorships.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const totalPaid = sponsorships.reduce((sum, s) => sum + (Number(s.amountPaid) || 0), 0);
    const totalBalance = sponsorships.reduce((sum, s) => sum + (Number(s.balanceAmount) || 0), 0);
    const distinctPackagesCount = itemsBreakdown.filter(i => i.quantitySponsored > 0).length;

    return {
      totalItems,
      totalCommitted,
      totalPaid,
      totalBalance,
      distinctPackagesCount
    };
  }, [sponsorships, itemsBreakdown]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header Banner */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-xl)',
        padding: '20px',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Package size={22} color="#2C82C9" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                {title}
              </h3>
            </div>
            {subtitle && (
              <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '4px 0 0 0' }}>
                {subtitle}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              id="btn-export-sponsorships-csv"
              onClick={() => exportSponsorshipsToCSV(sponsorships, `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_detailed_report`)}
              className="btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                fontSize: '0.84rem'
              }}
              title="Download detailed CSV report of all sponsorships"
            >
              <Download size={16} color="#008A2E" />
              <span>Export CSV Report</span>
            </button>

            {onOpenSponsorshipModal && (
              <button
                type="button"
                onClick={onOpenSponsorshipModal}
                className="btn-primary"
                style={{
                  background: '#2C82C9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  fontSize: '0.84rem'
                }}
              >
                <PlusCircle size={16} />
                <span>Book New Sponsorship</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
          gap: 10
        }}>
          <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid #E2E8F0', minWidth: 0 }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block' }}>
              Total Items Sponsored
            </span>
            <div style={{ fontSize: 'clamp(1.15rem, 3vw, 1.4rem)', fontWeight: 900, color: '#2C82C9', marginTop: 2 }}>
              {overallTotals.totalItems} <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B' }}>units</span>
            </div>
            <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block', marginTop: 2 }}>
              Across {overallTotals.distinctPackagesCount} item package types
            </span>
          </div>

          <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid #E2E8F0', minWidth: 0 }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block' }}>
              Total Committed
            </span>
            <div style={{ fontSize: 'clamp(1.15rem, 3vw, 1.4rem)', fontWeight: 900, color: '#0F172A', marginTop: 2 }}>
              ₹{overallTotals.totalCommitted.toLocaleString('en-IN')}
            </div>
            <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block', marginTop: 2 }}>
              Total pledged value
            </span>
          </div>

          <div style={{ background: '#EBF7EE', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid #A5D6B8', minWidth: 0 }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#008A2E', textTransform: 'uppercase', display: 'block' }}>
              Realized Collections
            </span>
            <div style={{ fontSize: 'clamp(1.15rem, 3vw, 1.4rem)', fontWeight: 900, color: '#008A2E', marginTop: 2 }}>
              ₹{overallTotals.totalPaid.toLocaleString('en-IN')}
            </div>
            <span style={{ fontSize: '0.68rem', color: '#008A2E', fontWeight: 600, display: 'block', marginTop: 2 }}>
              Received in funds
            </span>
          </div>

          <div style={{ background: overallTotals.totalBalance > 0 ? '#FEF2F2' : '#F8FAFC', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: overallTotals.totalBalance > 0 ? '1px solid #FECACA' : '1px solid #E2E8F0', minWidth: 0 }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: overallTotals.totalBalance > 0 ? '#B91C1C' : '#64748B', textTransform: 'uppercase', display: 'block' }}>
              Pending Balance
            </span>
            <div style={{ fontSize: 'clamp(1.15rem, 3vw, 1.4rem)', fontWeight: 900, color: overallTotals.totalBalance > 0 ? '#B91C1C' : '#64748B', marginTop: 2 }}>
              ₹{overallTotals.totalBalance.toLocaleString('en-IN')}
            </div>
            <span style={{ fontSize: '0.68rem', color: overallTotals.totalBalance > 0 ? '#B91C1C' : '#64748B', display: 'block', marginTop: 2 }}>
              {overallTotals.totalBalance > 0 ? 'Awaiting collection' : 'Fully settled'}
            </span>
          </div>
        </div>
      </div>

      {/* Item-by-Item Breakdown Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 14 }}>
        {itemsBreakdown.map((item) => {
          const isExpanded = expandedItem === item.itemName;
          const percentPaid = item.totalCommitted > 0 ? Math.min(100, Math.round((item.totalPaid / item.totalCommitted) * 100)) : 0;

          return (
            <div
              key={item.itemName}
              style={{
                background: '#FFFFFF',
                borderRadius: 'var(--radius-lg)',
                border: item.quantitySponsored > 0 ? '1px solid #B8D4EE' : '1px solid var(--border-subtle)',
                boxShadow: item.quantitySponsored > 0 ? '0 2px 6px rgba(44, 130, 201, 0.08)' : 'var(--shadow-sm)',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease'
              }}
            >
              <div>
                {/* Header Row: Title & Unit Price */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                      {item.itemName}
                    </h4>
                    <span style={{
                      display: 'inline-block',
                      marginTop: 3,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#2C82C9',
                      background: '#EDF4FA',
                      padding: '2px 8px',
                      borderRadius: 4
                    }}>
                      ₹{item.itemPrice.toLocaleString('en-IN')} / unit
                    </span>
                  </div>

                  {/* PROMINENT QUANTITY SPONSORED NUMBER */}
                  <div style={{
                    textAlign: 'center',
                    background: item.quantitySponsored > 0 ? '#EBF7EE' : '#F1F5F9',
                    border: item.quantitySponsored > 0 ? '1px solid #A5D6B8' : '1px solid #E2E8F0',
                    borderRadius: 'var(--radius-md)',
                    padding: '6px 12px',
                    minWidth: 72
                  }}>
                    <div style={{
                      fontSize: '1.35rem',
                      fontWeight: 900,
                      color: item.quantitySponsored > 0 ? '#008A2E' : '#64748B',
                      lineHeight: 1
                    }}>
                      {item.quantitySponsored}
                    </div>
                    <span style={{
                      fontSize: '0.64rem',
                      fontWeight: 700,
                      color: item.quantitySponsored > 0 ? '#008A2E' : '#64748B',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>
                      Sponsored
                    </span>
                  </div>
                </div>

                {item.description && (
                  <p style={{ fontSize: '0.74rem', color: '#64748B', margin: '8px 0 0 0', lineHeight: 1.4 }}>
                    {item.description}
                  </p>
                )}

                {/* Financial Progress for Item */}
                <div style={{
                  background: '#F8FAFC',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  marginTop: 14,
                  border: '1px solid #E2E8F0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
                    <span style={{ color: '#64748B' }}>Collected Funds:</span>
                    <strong style={{ color: '#008A2E', fontWeight: 800 }}>
                      ₹{item.totalPaid.toLocaleString('en-IN')} <span style={{ color: '#64748B', fontWeight: 400 }}>/ ₹{item.totalCommitted.toLocaleString('en-IN')}</span>
                    </strong>
                  </div>

                  {/* Item Progress Bar */}
                  <div style={{
                    width: '100%',
                    height: 6,
                    background: '#E2E8F0',
                    borderRadius: 9999,
                    overflow: 'hidden',
                    margin: '6px 0'
                  }}>
                    <div style={{
                      width: `${percentPaid}%`,
                      height: '100%',
                      background: percentPaid === 100 ? '#008A2E' : '#2C82C9',
                      borderRadius: 9999
                    }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748B' }}>
                    <span>{percentPaid}% realized</span>
                    {item.totalBalance > 0 ? (
                      <span style={{ color: '#B91C1C', fontWeight: 700 }}>
                        ₹{item.totalBalance.toLocaleString('en-IN')} pending balance
                      </span>
                    ) : (
                      <span style={{ color: '#008A2E', fontWeight: 700 }}>
                        {item.quantitySponsored > 0 ? 'Fully Paid' : 'Available for sponsorship'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Sponsors Toggle / Details */}
              {item.sponsors.length > 0 && (
                <div style={{ marginTop: 14, borderTop: '1px solid #F1F5F9', paddingTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => setExpandedItem(isExpanded ? null : item.itemName)}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      padding: '4px 0',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      color: '#2C82C9'
                    }}
                  >
                    <span>{isExpanded ? 'Hide' : 'View'} {item.sponsors.length} Sponsoring {item.sponsors.length === 1 ? 'Donor' : 'Donors'}</span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {isExpanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                      {item.sponsors.map((sp) => (
                        <div
                          key={sp.sponsorshipId || sp.receiptToken}
                          style={{
                            padding: '8px 10px',
                            background: '#F4F9FD',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid #E2E8F0',
                            fontSize: '0.72rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ color: '#0F172A' }}>{sp.donorName}</strong>
                            <span style={{
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              padding: '1px 5px',
                              borderRadius: 4,
                              background: sp.paymentStatus === 'Completed' ? '#EBF7EE' : '#FEF3C7',
                              color: sp.paymentStatus === 'Completed' ? '#008A2E' : '#B45309'
                            }}>
                              {sp.quantity} units • {sp.paymentStatus}
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                            <span style={{ color: '#64748B' }}>
                              Token: <strong style={{ color: '#2C82C9' }}>{sp.receiptToken}</strong>
                            </span>
                            <span style={{ color: '#008A2E', fontWeight: 800 }}>
                              ₹{sp.amountPaid.toLocaleString('en-IN')}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                            {onViewReceipt && (
                              <button
                                type="button"
                                onClick={() => onViewReceipt(sp)}
                                style={{
                                  padding: '2px 8px',
                                  fontSize: '0.68rem',
                                  borderRadius: 4,
                                  border: '1px solid #CBD5E1',
                                  background: '#FFFFFF',
                                  cursor: 'pointer',
                                  color: '#334155',
                                  fontWeight: 600
                                }}
                              >
                                View Receipt
                              </button>
                            )}

                            {sp.balanceAmount > 0 && onOpenPayBalance && (
                              <button
                                type="button"
                                onClick={() => onOpenPayBalance(sp)}
                                style={{
                                  padding: '2px 8px',
                                  fontSize: '0.68rem',
                                  borderRadius: 4,
                                  border: 'none',
                                  background: '#008A2E',
                                  color: '#FFFFFF',
                                  cursor: 'pointer',
                                  fontWeight: 700
                                }}
                              >
                                Pay Bal (₹{sp.balanceAmount.toLocaleString('en-IN')})
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
