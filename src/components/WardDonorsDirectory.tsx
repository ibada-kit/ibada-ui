import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { User, WardDonorsResponse } from '../types';
import { donationsApi } from '../services/api';
import { 
  Users, 
  Search, 
  X, 
  Package, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  RotateCw, 
  PlusCircle,
  MapPin
} from 'lucide-react';

export interface WardDonorsDirectoryProps {
  user: User;
  onSelectDonor?: (donorName: string) => void;
  onNavigateToRecord?: () => void;
}

export const WardDonorsDirectory: React.FC<WardDonorsDirectoryProps> = ({
  user,
  onSelectDonor: _onSelectDonor,
  onNavigateToRecord
}) => {
  const [data, setData] = useState<WardDonorsResponse | null>(null);
  const [search, setSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchDonors = useCallback(async (searchTerm: string, page: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await donationsApi.getWardDonors({
        search: searchTerm.trim() || undefined,
        pageNumber: page,
        pageSize
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve ward donors directory.');
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);

  // Live debounced search (300ms) resets to page 1
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setPageNumber(1);
      fetchDonors(search, 1);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [search, fetchDonors]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || (data && newPage > data.totalPages)) return;
    setPageNumber(newPage);
    fetchDonors(search, newPage);
  };

  const handleClearSearch = () => {
    setSearch('');
  };

  const effectiveWard = data?.wardNumber || user.wardNumber;

  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: 'var(--radius-xl)',
      border: '1px solid var(--border-subtle)',
      boxShadow: 'var(--shadow-sm)',
      padding: 'clamp(16px, 3vw, 24px)',
      marginBottom: 20
    }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 12,
        paddingBottom: 16,
        borderBottom: '1px solid #E2E8F0'
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: '#EBF7EE',
              color: '#008A2E',
              border: '1px solid #A7F3D0',
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.72rem',
              fontWeight: 800,
              textTransform: 'uppercase'
            }}>
              <MapPin size={12} />
              Ward {effectiveWard || '—'} Directory
            </span>
          </div>

          <h2 style={{
            fontSize: 'clamp(1.15rem, 3.5vw, 1.45rem)',
            fontWeight: 900,
            color: '#0F172A',
            margin: '4px 0 0 0',
            letterSpacing: '-0.01em'
          }}>
            Ward {effectiveWard ? `${effectiveWard} ` : ''}Donors
          </h2>
        </div>

        {/* Counter Badge */}
        {data && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'linear-gradient(135deg, #EBF7EE 0%, #D1FAE5 100%)',
            color: '#008A2E',
            border: '1px solid #A7F3D0',
            padding: '6px 14px',
            borderRadius: 9999,
            fontSize: '0.82rem',
            fontWeight: 800,
            boxShadow: '0 2px 6px rgba(0, 138, 46, 0.08)',
            flexShrink: 0
          }}>
            <Users size={14} />
            <span>{data.totalDonors} {data.totalDonors === 1 ? 'Donor' : 'Donors'}</span>
          </div>
        )}
      </div>

      {/* Search Input Bar */}
      <div style={{
        marginTop: 14,
        position: 'relative',
        display: 'flex',
        alignItems: 'center'
      }}>
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: 14,
            color: '#94A3B8',
            pointerEvents: 'none'
          }}
        />
        <input
          id="ward-donors-search-input"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search donor by name (e.g. Faisal, Abdul, Khadija)..."
          style={{
            width: '100%',
            padding: '11px 40px 11px 40px',
            borderRadius: 'var(--radius-md)',
            border: '1.5px solid #CBD5E1',
            background: '#FFFFFF',
            fontSize: '0.88rem',
            color: '#0F172A',
            outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#008A2E';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 138, 46, 0.12)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#CBD5E1';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />

        {search && (
          <button
            type="button"
            onClick={handleClearSearch}
            aria-label="Clear search"
            style={{
              position: 'absolute',
              right: 12,
              background: '#E2E8F0',
              border: 'none',
              borderRadius: '50%',
              width: 22,
              height: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569',
              padding: 0
            }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{
          marginTop: 14,
          padding: '12px 14px',
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          color: '#B91C1C',
          fontSize: '0.82rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchDonors(search, pageNumber)}
            style={{
              background: '#B91C1C',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 10px',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <RotateCw size={12} />
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton State */}
      {isLoading && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              style={{
                height: 54,
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)',
                backgroundSize: '200% 100%',
                animation: 'pulse 1.5s infinite ease-in-out'
              }}
            />
          ))}
        </div>
      )}

      {/* Donors List (Alphabetical A-Z, Only Name & Kit Count) */}
      {!isLoading && data && data.donors.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.donors.map((donor, idx) => {
            const initial = donor.donorName ? donor.donorName.trim().charAt(0).toUpperCase() : '?';
            return (
              <div
                key={`${donor.donorName}-${idx}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 'var(--radius-md)',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#A7F3D0';
                  e.currentTarget.style.background = '#F9FDFB';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.background = '#FFFFFF';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                {/* Left: Avatar & Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10B981 0%, #008A2E 100%)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    flexShrink: 0,
                    boxShadow: '0 2px 4px rgba(0, 138, 46, 0.2)'
                  }}>
                    {initial}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      color: '#0F172A',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {donor.donorName}
                    </div>
                    <div style={{ fontSize: '0.70rem', color: '#64748B' }}>
                      Ward {effectiveWard} Donor
                    </div>
                  </div>
                </div>

                {/* Right: Kit Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    background: '#EBF7EE',
                    color: '#008A2E',
                    border: '1px solid #A7F3D0',
                    borderRadius: 8,
                    fontSize: '0.78rem',
                    fontWeight: 800
                  }}>
                    <Package size={13} />
                    <span>{donor.kitCount} {donor.kitCount === 1 ? 'Kit' : 'Kits'}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data && data.donors.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '36px 16px',
          color: '#64748B'
        }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: '#F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px auto',
            color: '#94A3B8'
          }}>
            <Search size={24} />
          </div>
          <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#1E293B', marginBottom: 4 }}>
            {search.trim().length > 0
              ? `No donors matching "${search}"`
              : `No donations recorded under Ward ${effectiveWard || ''} yet`}
          </div>
          <p style={{ fontSize: '0.78rem', margin: '0 auto 14px auto', maxWidth: 380, lineHeight: 1.4 }}>
            {search.trim().length > 0
              ? 'Try searching with a different spelling or clear the search filter.'
              : 'Donations recorded by you or your ward team will automatically appear here once recorded.'}
          </p>

          {search.trim().length > 0 ? (
            <button
              type="button"
              onClick={handleClearSearch}
              style={{
                padding: '6px 14px',
                background: '#008A2E',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.80rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Clear Search Filter
            </button>
          ) : onNavigateToRecord ? (
            <button
              type="button"
              onClick={onNavigateToRecord}
              style={{
                padding: '7px 16px',
                background: '#008A2E',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.80rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <PlusCircle size={14} />
              Record First Donation
            </button>
          ) : null}
        </div>
      )}

      {/* Pagination Controls */}
      {data && data.totalPages > 1 && (
        <div style={{
          marginTop: 18,
          paddingTop: 14,
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10
        }}>
          <button
            id="ward-donors-prev-page"
            type="button"
            onClick={() => handlePageChange(pageNumber - 1)}
            disabled={!data.hasPreviousPage || isLoading}
            style={{
              padding: '6px 14px',
              background: data.hasPreviousPage && !isLoading ? '#FFFFFF' : '#F1F5F9',
              border: '1.5px solid #CBD5E1',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: data.hasPreviousPage && !isLoading ? '#0F172A' : '#94A3B8',
              cursor: data.hasPreviousPage && !isLoading ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.15s ease'
            }}
          >
            <ChevronLeft size={14} />
            Previous
          </button>

          <span style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 600 }}>
            Page <strong style={{ color: '#0F172A' }}>{data.pageNumber}</strong> of <strong style={{ color: '#0F172A' }}>{data.totalPages}</strong> ({data.totalDonors} total)
          </span>

          <button
            id="ward-donors-next-page"
            type="button"
            onClick={() => handlePageChange(pageNumber + 1)}
            disabled={!data.hasNextPage || isLoading}
            style={{
              padding: '6px 14px',
              background: data.hasNextPage && !isLoading ? '#FFFFFF' : '#F1F5F9',
              border: '1.5px solid #CBD5E1',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: data.hasNextPage && !isLoading ? '#0F172A' : '#94A3B8',
              cursor: data.hasNextPage && !isLoading ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.15s ease'
            }}
          >
            Next
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
