import React, { useState, useEffect } from 'react';
import { Building2, User, CheckCircle, AlertCircle, RefreshCw, IndianRupee, Clock, Check, Plus, Minus, Layers } from 'lucide-react';
import { sponsorshipsApi } from '../services/api';
import type { SponsorshipItem, SponsorshipRecord, PaymentOption, PaymentMode } from '../types';

const DEFAULT_CATALOG_ITEMS: SponsorshipItem[] = [
  {
    itemId: 'ITEM-001',
    name: 'Family Food Relief Kit Pack',
    itemPrice: 5000,
    description: 'Provides essential food supplies and ration for a needy family for one month.',
    isActive: true,
    displayOrder: 1
  },
  {
    itemId: 'ITEM-002',
    name: 'Student Education & School Kit Pack',
    itemPrice: 2500,
    description: 'Includes school bag, books, uniform materials, and stationery for underprivileged students.',
    isActive: true,
    displayOrder: 2
  },
  {
    itemId: 'ITEM-003',
    name: 'Emergency Medical Care Support Pack',
    itemPrice: 10000,
    description: 'Supports life-saving medicines and treatment costs for chronically ill community members.',
    isActive: true,
    displayOrder: 3
  },
  {
    itemId: 'ITEM-004',
    name: 'Complete Ramadan / Eid Family Hamper',
    itemPrice: 7500,
    description: 'Full celebratory festive food, clothing assistance, and gift hamper for a vulnerable family.',
    isActive: true,
    displayOrder: 4
  }
];

interface SponsorshipFormProps {
  onSuccess?: (sponsorship: SponsorshipRecord) => void;
  onCancel?: () => void;
  hideHeader?: boolean;
}

export const SponsorshipForm: React.FC<SponsorshipFormProps> = ({
  onSuccess,
  onCancel,
  hideHeader = false
}) => {
  // Catalog Packages (Loaded live from server with local defaults fallback)
  const [packages, setPackages] = useState<SponsorshipItem[]>([]);
  // Item Quantities Map: itemId -> quantity
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});

  // Form Fields
  const [donorName, setDonorName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [paymentOption, setPaymentOption] = useState<PaymentOption>('PayFull');
  const [initialAmountPaid, setInitialAmountPaid] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [transactionReference, setTransactionReference] = useState('');
  const [notes, setNotes] = useState('');

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordedRecord, setRecordedRecord] = useState<SponsorshipRecord | null>(null);

  // Load active catalog items from API
  useEffect(() => {
    let isMounted = true;
    sponsorshipsApi.getItems()
      .then((items) => {
        if (isMounted) {
          const activeItems = (items && items.length > 0) ? items : DEFAULT_CATALOG_ITEMS;
          setPackages(activeItems);
          setItemQuantities((prev) => {
            if (Object.keys(prev).length > 0) return prev;
            return { [activeItems[0].itemId]: 1 };
          });
          setInitialAmountPaid((prev) => prev > 0 ? prev : activeItems[0].itemPrice);
        }
      })
      .catch((err) => {
        console.warn('Could not load packages from server, using default catalog:', err);
        if (isMounted) {
          setPackages(DEFAULT_CATALOG_ITEMS);
          setItemQuantities((prev) => {
            if (Object.keys(prev).length > 0) return prev;
            return { [DEFAULT_CATALOG_ITEMS[0].itemId]: 1 };
          });
          setInitialAmountPaid((prev) => prev > 0 ? prev : DEFAULT_CATALOG_ITEMS[0].itemPrice);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedItems = packages.filter((p) => (itemQuantities[p.itemId] || 0) > 0);
  const totalQuantity = selectedItems.reduce((sum, p) => sum + (itemQuantities[p.itemId] || 0), 0);
  const totalAmount = selectedItems.reduce((sum, p) => sum + (itemQuantities[p.itemId] || 0) * p.itemPrice, 0);

  const handleSetItemQuantity = (itemId: string, newQty: number) => {
    const clamped = Math.max(0, Math.min(2000, Math.floor(newQty || 0)));
    const updated = { ...itemQuantities, [itemId]: clamped };
    setItemQuantities(updated);

    const newTotal = packages.reduce((sum, p) => sum + (updated[p.itemId] || 0) * p.itemPrice, 0);
    if (paymentOption === 'PayFull') {
      setInitialAmountPaid(newTotal);
    } else if (paymentOption === 'Advance') {
      if (initialAmountPaid > newTotal || initialAmountPaid === 0) {
        setInitialAmountPaid(Math.round(newTotal * 0.5));
      }
    } else if (paymentOption === 'Book') {
      if (initialAmountPaid > newTotal) {
        setInitialAmountPaid(newTotal);
      }
    }
  };

  const handleToggleItem = (itemId: string) => {
    const current = itemQuantities[itemId] || 0;
    handleSetItemQuantity(itemId, current > 0 ? 0 : 1);
  };

  // Synchronize initial payment when payment option changes
  const handlePaymentOptionChange = (option: PaymentOption) => {
    setPaymentOption(option);
    if (option === 'PayFull') {
      setInitialAmountPaid(totalAmount);
    } else if (option === 'Book') {
      setInitialAmountPaid(0);
    } else if (option === 'Advance') {
      setInitialAmountPaid(Math.round(totalAmount * 0.5));
    }
  };

  const balanceAmount = Math.max(0, totalAmount - (initialAmountPaid || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRecordedRecord(null);

    if (!donorName.trim()) {
      setError('Please enter the organization or firm name.');
      return;
    }

    const cleanPhone = mobileNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit WhatsApp number.');
      return;
    }

    if (selectedItems.length === 0 || totalQuantity < 1) {
      setError('Please select at least one sponsor item and set quantity to 1 or more.');
      return;
    }

    // Validate payment options
    if (paymentOption === 'Advance') {
      if (!initialAmountPaid || initialAmountPaid <= 0) {
        setError('Advance payment requires an upfront paid amount greater than ₹0.');
        return;
      }
      if (initialAmountPaid >= totalAmount) {
        setError(`Advance amount (₹${initialAmountPaid.toLocaleString('en-IN')}) cannot be equal to or greater than total (₹${totalAmount.toLocaleString('en-IN')}). Choose "Pay Full" for full payment.`);
        return;
      }
    } else if (paymentOption === 'Book') {
      if (initialAmountPaid > totalAmount) {
        setError(`Booking amount cannot exceed total sponsorship amount (₹${totalAmount.toLocaleString('en-IN')}).`);
        return;
      }
    }

    try {
      setSubmitting(true);

      const payload = {
        donorName: donorName.trim(),
        contactPerson: contactPerson.trim() || undefined,
        mobileNumber: `+91${cleanPhone.slice(-10)}`,
        itemId: selectedItems[0].itemId,
        quantity: totalQuantity,
        items: selectedItems.map((item) => ({
          itemId: item.itemId,
          quantity: itemQuantities[item.itemId] || 1
        })),
        paymentOption,
        initialAmountPaid: paymentOption === 'PayFull' ? totalAmount : initialAmountPaid,
        paymentMode,
        transactionReference: transactionReference.trim() || undefined,
        notes: notes.trim() || undefined
      };

      const result = await sponsorshipsApi.acceptSponsorship(payload);

      // Construct item details from selected items
      const selectedItemDetails = selectedItems.map((item) => {
        const qty = itemQuantities[item.itemId] || 1;
        return {
          itemId: item.itemId,
          name: item.name,
          unitPrice: item.itemPrice,
          quantity: qty,
          subtotal: qty * item.itemPrice
        };
      });

      const combinedName = selectedItemDetails.length === 1
        ? selectedItemDetails[0].name
        : selectedItemDetails.map((i) => `${i.quantity}x ${i.name}`).join(', ');

      const enrichedRecord: SponsorshipRecord = {
        ...result,
        items: (result.items && result.items.length > 0) ? result.items : selectedItemDetails,
        itemsJson: result.itemsJson || JSON.stringify(selectedItemDetails),
        itemName: (result.items && result.items.length > 0) ? result.itemName : combinedName
      };

      setRecordedRecord(enrichedRecord);
      if (onSuccess) {
        onSuccess(enrichedRecord);
      }

      // Reset form
      setDonorName('');
      setContactPerson('');
      setMobileNumber('');
      setItemQuantities(packages.length > 0 ? { [packages[0].itemId]: 1 } : {});
      setPaymentOption('PayFull');
      setTransactionReference('');
      setNotes('');
    } catch (err: any) {
      setError(err.message || 'Failed to record sponsorship.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: 'var(--radius-xl)',
      padding: hideHeader ? '0' : '22px clamp(14px, 4vw, 20px)',
      border: hideHeader ? 'none' : '1px solid var(--border-subtle)',
      boxShadow: hideHeader ? 'none' : 'var(--shadow-sm)',
      maxWidth: 620,
      margin: '0 auto',
      width: '100%'
    }}>
      {/* Header (Optional / Skipped inside modal to avoid duplicate headers) */}
      {!hideHeader && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          paddingBottom: 16,
          marginBottom: 18,
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: '#EDF4FA',
            border: '1px solid #B8D4EE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2C82C9',
            flexShrink: 0
          }}>
            <Building2 size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 'clamp(1.05rem, 3vw, 1.2rem)', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Accept Sponsorship
              </h2>
              <span style={{
                background: '#EBF7EE',
                color: '#008A2E',
                border: '1px solid #A5D6B8',
                fontSize: '0.62rem',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: 'var(--radius-full)'
              }}>
                Instant Receipt
              </span>
            </div>
            <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600, display: 'block', marginTop: 2 }}>
              Record customized sponsorship packages with full, advance, or booking terms
            </span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 14px',
          borderRadius: 'var(--radius-md)',
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          color: '#B91C1C',
          fontSize: '0.84rem',
          fontWeight: 600,
          marginBottom: 16
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Success Notification */}
      {recordedRecord && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          padding: '14px 16px',
          borderRadius: 'var(--radius-md)',
          background: '#EBF7EE',
          border: '1px solid #A5D6B8',
          color: '#008A2E',
          fontSize: '0.86rem',
          marginBottom: 18
        }}>
          <CheckCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <span style={{ fontWeight: 800 }}>Sponsorship Registered!</span>
            <div style={{ fontSize: '0.78rem', color: '#334155', marginTop: 3 }}>
              Receipt Token:{' '}
              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#008A2E', marginRight: 6 }}>
                {recordedRecord.receiptToken}
              </span>
              • Registered for {recordedRecord.donorName} ({recordedRecord.quantity} units, ₹{recordedRecord.totalAmount.toLocaleString('en-IN')}).
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Organization / Firm Name */}
        <div style={{ marginBottom: 14 }}>
          <label style={{
            display: 'block',
            fontSize: '0.76rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#334155',
            marginBottom: 6
          }}>
            Firm / Organization Name *
          </label>
          <div style={{ position: 'relative' }}>
            <Building2 size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              required
              className="input-field"
              style={{ paddingLeft: 42 }}
              placeholder="e.g. Al-Noor Trading LLC / Malabar Builders"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
            />
          </div>
        </div>

        {/* WhatsApp Mobile Number & Contact Person */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
          {/* WhatsApp Phone Number */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.76rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#334155',
              marginBottom: 6
            }}>
              WhatsApp Phone Number *
            </label>
            <div style={{ display: 'flex' }}>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                background: '#F4F9FD',
                border: '1px solid #CBD5E1',
                borderRight: 'none',
                borderRadius: 'var(--radius-md) 0 0 var(--radius-md)',
                color: '#334155',
                fontSize: '0.88rem',
                fontWeight: 700
              }}>
                🇮🇳 +91
              </span>
              <input
                type="tel"
                required
                className="input-field"
                style={{ borderRadius: '0 var(--radius-md) var(--radius-md) 0' }}
                maxLength={13}
                placeholder="98471 23456"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Contact Representative */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.76rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#334155',
              marginBottom: 6
            }}>
              Contact Person (Optional)
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                className="input-field"
                style={{ paddingLeft: 42 }}
                placeholder="e.g. Faisal (Director / Manager)"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Sponsor Item Selection List with Quantity Counter & Multi-Select */}
        <div style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 16px',
          marginBottom: 16
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={16} color="#2C82C9" />
              <label style={{
                fontSize: '0.76rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#334155'
              }}>
                Select Sponsor Items *
              </label>
            </div>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: totalQuantity > 0 ? '#008A2E' : '#64748B',
              background: totalQuantity > 0 ? '#EBF7EE' : '#F1F5F9',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              border: `1px solid ${totalQuantity > 0 ? '#A5D6B8' : '#CBD5E1'}`
            }}>
              {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'} selected ({totalQuantity} {totalQuantity === 1 ? 'unit' : 'units'})
            </span>
          </div>

          {/* Interactive Item Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {packages.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
                Loading catalog items...
              </div>
            ) : (
              packages.map((pkg) => {
                const qty = itemQuantities[pkg.itemId] || 0;
                const isSelected = qty > 0;
                const itemSubtotal = qty * pkg.itemPrice;

                return (
                  <div
                    key={pkg.itemId}
                    style={{
                      background: isSelected ? '#F0F7FF' : '#FFFFFF',
                      border: isSelected ? '2px solid #2C82C9' : '1.5px solid #E2E8F0',
                      borderRadius: 'var(--radius-lg)',
                      padding: '12px 14px',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 8px rgba(44, 130, 201, 0.10)' : 'none'
                    }}
                  >
                    {/* Header Row: Checkbox + Name + Unit Price */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div
                        onClick={() => handleToggleItem(pkg.itemId)}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', flex: 1 }}
                      >
                        {/* Custom Checkbox */}
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            border: isSelected ? '2px solid #2C82C9' : '2px solid #CBD5E1',
                            background: isSelected ? '#2C82C9' : '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: 1,
                            flexShrink: 0,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                        </div>

                        <div>
                          <span style={{
                            fontSize: '0.92rem',
                            fontWeight: 800,
                            color: isSelected ? '#0F172A' : '#334155',
                            lineHeight: 1.3,
                            display: 'block'
                          }}>
                            {pkg.name}
                          </span>
                          {pkg.description && (
                            <span style={{
                              fontSize: '0.74rem',
                              color: '#64748B',
                              display: 'block',
                              marginTop: 3,
                              lineHeight: 1.3
                            }}>
                              {pkg.description}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price badge */}
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        color: '#008A2E',
                        background: '#EBF7EE',
                        border: '1px solid #A5D6B8',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-full)',
                        flexShrink: 0,
                        whiteSpace: 'nowrap'
                      }}>
                        ₹{pkg.itemPrice.toLocaleString('en-IN')} / unit
                      </span>
                    </div>

                    {/* Stepper + Subtotal Controls Row */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 10,
                      paddingTop: 10,
                      borderTop: '1px solid #E2E8F0',
                      flexWrap: 'wrap',
                      gap: 8
                    }}>
                      {/* Quantity Stepper */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                          Quantity:
                        </span>

                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          border: isSelected ? '1.5px solid #2C82C9' : '1px solid #CBD5E1',
                          borderRadius: 'var(--radius-md)',
                          background: '#FFFFFF',
                          overflow: 'hidden'
                        }}>
                          {/* Decrement Button */}
                          <button
                            type="button"
                            onClick={() => handleSetItemQuantity(pkg.itemId, qty - 1)}
                            disabled={qty <= 0}
                            style={{
                              width: 32,
                              height: 32,
                              border: 'none',
                              background: qty > 0 ? '#F1F5F9' : '#F8FAFC',
                              color: qty > 0 ? '#0F172A' : '#CBD5E1',
                              cursor: qty > 0 ? 'pointer' : 'not-allowed',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'background 0.15s'
                            }}
                            title="Decrease quantity"
                          >
                            <Minus size={14} strokeWidth={2.5} />
                          </button>

                          {/* Numeric Input */}
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={qty}
                            onChange={(e) => {
                              const clean = e.target.value.replace(/\D/g, '');
                              handleSetItemQuantity(pkg.itemId, clean === '' ? 0 : parseInt(clean, 10));
                            }}
                            onKeyDown={(e) => {
                              if (['.', ',', 'e', 'E', '+', '-'].includes(e.key)) {
                                e.preventDefault();
                              }
                            }}
                            style={{
                              width: 46,
                              height: 32,
                              border: 'none',
                              borderLeft: '1px solid #E2E8F0',
                              borderRight: '1px solid #E2E8F0',
                              textAlign: 'center',
                              fontWeight: 800,
                              fontSize: '0.9rem',
                              color: '#0F172A',
                              padding: 0,
                              outline: 'none',
                              background: '#FFFFFF'
                            }}
                          />

                          {/* Increment Button */}
                          <button
                            type="button"
                            onClick={() => handleSetItemQuantity(pkg.itemId, qty + 1)}
                            style={{
                              width: 32,
                              height: 32,
                              border: 'none',
                              background: '#2C82C9',
                              color: '#FFFFFF',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'background 0.15s'
                            }}
                            title="Increase quantity"
                          >
                            <Plus size={14} strokeWidth={2.5} />
                          </button>
                        </div>

                        {/* Quick +5 button */}
                        {/* <button
                          type="button"
                          onClick={() => handleSetItemQuantity(pkg.itemId, qty + 5)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid #CBD5E1',
                            background: '#F8FAFC',
                            color: '#475569',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          title="Add 5 units"
                        >
                          +5
                        </button> */}
                      </div>

                      {/* Item Subtotal */}
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.66rem', color: '#64748B', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                          Item Subtotal
                        </span>
                        <span style={{
                          fontSize: '0.94rem',
                          fontWeight: 900,
                          color: isSelected ? '#008A2E' : '#94A3B8'
                        }}>
                          {isSelected ? `₹${itemSubtotal.toLocaleString('en-IN')}` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Committed Total Summary Bar */}
          <div style={{
            marginTop: 12,
            background: '#FFFFFF',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid #CBD5E1',
            flexWrap: 'wrap',
            gap: 8
          }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                Total Committed Items
              </span>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#334155' }}>
                {totalQuantity} {totalQuantity === 1 ? 'unit' : 'units'} across {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                Total Commitment
              </span>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0F172A' }}>
                ₹{totalAmount.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Terms Option */}
        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: 'block',
            fontSize: '0.76rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#334155',
            marginBottom: 8
          }}>
            Payment Option *
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {/* 1. PayFull */}
            <button
              type="button"
              onClick={() => handlePaymentOptionChange('PayFull')}
              style={{
                padding: '10px 8px',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                border: paymentOption === 'PayFull' ? '2.5px solid #008A2E' : '1px solid #CBD5E1',
                background: paymentOption === 'PayFull' ? '#EBF7EE' : '#FFFFFF',
                color: paymentOption === 'PayFull' ? '#008A2E' : '#334155',
                textAlign: 'center',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 800, fontSize: '0.84rem' }}>
                {paymentOption === 'PayFull' && <Check size={14} strokeWidth={3} />}
                <span>Pay Full</span>
              </div>
              <span style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                background: paymentOption === 'PayFull' ? '#008A2E' : '#E2E8F0',
                color: paymentOption === 'PayFull' ? '#FFFFFF' : '#475569',
                padding: '2px 6px',
                borderRadius: 'var(--radius-full)'
              }}>
                100% Paid
              </span>
            </button>

            {/* 2. Advance */}
            <button
              type="button"
              onClick={() => handlePaymentOptionChange('Advance')}
              style={{
                padding: '10px 8px',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                border: paymentOption === 'Advance' ? '2.5px solid #D97706' : '1px solid #CBD5E1',
                background: paymentOption === 'Advance' ? '#FEF3C7' : '#FFFFFF',
                color: paymentOption === 'Advance' ? '#B45309' : '#334155',
                textAlign: 'center',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 800, fontSize: '0.84rem' }}>
                <Clock size={14} strokeWidth={2.5} />
                <span>Advance</span>
              </div>
              <span style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                background: paymentOption === 'Advance' ? '#D97706' : '#E2E8F0',
                color: paymentOption === 'Advance' ? '#FFFFFF' : '#475569',
                padding: '2px 6px',
                borderRadius: 'var(--radius-full)'
              }}>
                Partial Payment
              </span>
            </button>

            {/* 3. Book */}
            <button
              type="button"
              onClick={() => handlePaymentOptionChange('Book')}
              style={{
                padding: '10px 8px',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                border: paymentOption === 'Book' ? '2.5px solid #2C82C9' : '1px solid #CBD5E1',
                background: paymentOption === 'Book' ? '#EDF4FA' : '#FFFFFF',
                color: paymentOption === 'Book' ? '#2C82C9' : '#334155',
                textAlign: 'center',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 800, fontSize: '0.84rem' }}>
                <IndianRupee size={14} strokeWidth={2.5} />
                <span>Book / Reserve</span>
              </div>
              <span style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                background: paymentOption === 'Book' ? '#2C82C9' : '#E2E8F0',
                color: paymentOption === 'Book' ? '#FFFFFF' : '#475569',
                padding: '2px 6px',
                borderRadius: 'var(--radius-full)'
              }}>
                Pay Later
              </span>
            </button>
          </div>
        </div>

        {/* Dynamic Amount Paid / Balance Row (If Advance or Book) */}
        {paymentOption !== 'PayFull' && (
          <div style={{
            background: paymentOption === 'Advance' ? '#FFFBEB' : '#F4F9FD',
            border: paymentOption === 'Advance' ? '1px solid #FDE68A' : '1px solid #B8D4EE',
            borderRadius: 'var(--radius-lg)',
            padding: '14px',
            marginBottom: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            alignItems: 'center'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.74rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#334155',
                marginBottom: 6
              }}>
                {paymentOption === 'Advance' ? 'Advance Paid Now (₹) *' : 'Initial Paid Amount (₹)'}
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="input-field"
                value={initialAmountPaid}
                onChange={(e) => {
                  const clean = e.target.value.replace(/\D/g, '');
                  if (clean === '') {
                    setInitialAmountPaid(0);
                  } else {
                    const parsed = parseInt(clean, 10);
                    setInitialAmountPaid(Math.min(totalAmount, parsed));
                  }
                }}
                onKeyDown={(e) => {
                  if (['.', ',', 'e', 'E', '+', '-'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                placeholder={paymentOption === 'Book' ? '0' : '5000'}
                style={{
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  color: '#0F172A',
                  background: '#FFFFFF'
                }}
              />
            </div>

            <div style={{
              background: '#FFFFFF',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #E2E8F0'
            }}>
              <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                Remaining Balance Due
              </span>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: balanceAmount > 0 ? '#B91C1C' : '#008A2E' }}>
                ₹{balanceAmount.toLocaleString('en-IN')}
              </div>
              <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                {balanceAmount > 0 ? 'Collectable in follow-up' : 'All cleared'}
              </span>
            </div>
          </div>
        )}

        {/* Payment Mode Pills */}
        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: 'block',
            fontSize: '0.74rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#334155',
            marginBottom: 6
          }}>
            Payment Method
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {(['Cash', 'UPI', 'BankTransfer', 'Cheque'] as PaymentMode[]).map((mode) => (
              <button
                type="button"
                key={mode}
                onClick={() => setPaymentMode(mode)}
                style={{
                  padding: '8px 4px',
                  borderRadius: 'var(--radius-md)',
                  border: paymentMode === mode ? '1.5px solid #2C82C9' : '1px solid #CBD5E1',
                  background: paymentMode === mode ? '#EDF4FA' : '#FFFFFF',
                  color: paymentMode === mode ? '#2C82C9' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'center'
                }}
              >
                {mode === 'BankTransfer' ? 'Bank' : mode}
              </button>
            ))}
          </div>
        </div>

        {/* Optional Reference for UPI/Cheque/Bank */}
        {paymentMode !== 'Cash' && (
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: '0.74rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#334155',
              marginBottom: 6
            }}>
              {paymentMode} Reference / Transaction ID (Optional)
            </label>
            <input
              type="text"
              className="input-field"
              placeholder={`e.g. ${paymentMode === 'UPI' ? 'UPI Ref / UTR No.' : paymentMode === 'Cheque' ? 'Cheque No. & Bank' : 'NEFT / IMPS Ref'}`}
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
            />
          </div>
        )}

        {/* Summary Footer Box */}
        <div style={{
          background: '#F4F9FD',
          border: '1px solid #B8D4EE',
          borderRadius: 'var(--radius-lg)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 18
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>
              Amount Paid Now
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#008A2E', lineHeight: 1.1 }}>
              ₹{(paymentOption === 'PayFull' ? totalAmount : initialAmountPaid).toLocaleString('en-IN')}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>
              Total Commitment
            </span>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
              ₹{totalAmount.toLocaleString('en-IN')}
            </div>
            {balanceAmount > 0 && (
              <span style={{ fontSize: '0.72rem', color: '#B91C1C', fontWeight: 700 }}>
                Balance: ₹{balanceAmount.toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary"
              style={{ flex: 1, padding: '12px' }}
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
            style={{
              flex: 2,
              padding: '13px',
              fontSize: '0.96rem',
              fontWeight: 800,
              background: '#2C82C9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            {submitting ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>Recording Sponsorship...</span>
              </>
            ) : (
              <>
                <Building2 size={18} />
                <span>Accept Sponsorship</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
