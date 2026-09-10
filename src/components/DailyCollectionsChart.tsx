import React, { useState, useMemo } from 'react';
import type { WeeklyMetrics, Donation } from '../types';
import { Calendar, X } from 'lucide-react';

interface DailyCollectionsChartProps {
  metrics: WeeklyMetrics | null;
  donations: Donation[];
  onViewReceipt?: (donation: Donation) => void;
  title?: string;
  subtitle?: string;
}

const dayIndices: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  0: 'Sun'
};

const daysList = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const DailyCollectionsChart: React.FC<DailyCollectionsChartProps> = ({
  metrics,
  donations,
  onViewReceipt: _onViewReceipt,
  title = 'Daily Kit Collections (Mon - Sun)',
  subtitle = 'Click on any day below to inspect respective collections & receipts'
}) => {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Group donations and metrics by day of week
  const dailyDataMap = useMemo(() => {
    const map: Record<string, {
      day: string;
      fullName: string;
      kits: number;
      amount: number;
      donations: Donation[];
    }> = {
      Mon: { day: 'Mon', fullName: 'Monday', kits: 0, amount: 0, donations: [] },
      Tue: { day: 'Tue', fullName: 'Tuesday', kits: 0, amount: 0, donations: [] },
      Wed: { day: 'Wed', fullName: 'Wednesday', kits: 0, amount: 0, donations: [] },
      Thu: { day: 'Thu', fullName: 'Thursday', kits: 0, amount: 0, donations: [] },
      Fri: { day: 'Fri', fullName: 'Friday', kits: 0, amount: 0, donations: [] },
      Sat: { day: 'Sat', fullName: 'Saturday', kits: 0, amount: 0, donations: [] },
      Sun: { day: 'Sun', fullName: 'Sunday', kits: 0, amount: 0, donations: [] }
    };

    // 1. Populate from metrics.dailyBreakdown if available
    if (metrics?.dailyBreakdown && Array.isArray(metrics.dailyBreakdown)) {
      metrics.dailyBreakdown.forEach((item) => {
        if (map[item.day]) {
          map[item.day].kits = item.kits || 0;
          map[item.day].amount = item.amount || 0;
        }
      });
    }

    // 2. Associate actual donations by timestamp day
    if (Array.isArray(donations)) {
      donations.forEach((d) => {
        if (d.timestamp) {
          const dt = new Date(d.timestamp);
          const dayCode = dayIndices[dt.getDay()];
          if (dayCode && map[dayCode]) {
            map[dayCode].donations.push(d);
          }
        }
      });
    }

    // 3. Ensure day counts reflect max of metrics or donation sums
    daysList.forEach((day) => {
      const entry = map[day];
      const sumKits = entry.donations.reduce((acc, curr) => acc + (curr.kitCount || 0), 0);
      const sumAmount = entry.donations.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
      if (sumKits > entry.kits) entry.kits = sumKits;
      if (sumAmount > entry.amount) entry.amount = sumAmount;
    });

    return map;
  }, [metrics?.dailyBreakdown, donations]);

  const allKits = daysList.map((day) => dailyDataMap[day]?.kits || 0);
  const maxKits = Math.max(10, ...allKits);
  const totalWeeklyKits = metrics?.totalKits || allKits.reduce((a, b) => a + b, 0) || 1;
  const activeDayData = selectedDay ? dailyDataMap[selectedDay] : null;

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
      {/* Header with Title and Clear Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
        <div>
          <span style={{
            fontSize: '0.74rem',
            color: '#0F172A',
            textTransform: 'uppercase',
            display: 'block',
            fontWeight: 800,
            letterSpacing: '0.04em'
          }}>
            {title}
          </span>
          <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
            {subtitle}
          </span>
        </div>

        {selectedDay && (
          <button
            type="button"
            onClick={() => setSelectedDay(null)}
            style={{
              background: '#EDF4FA',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              padding: '4px 10px',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#2C82C9',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <X size={12} />
            <span>Show All Days</span>
          </button>
        )}
      </div>

      {/* Interactive Bar Chart */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 8,
        height: 68,
        padding: '4px 2px 2px 2px'
      }}>
        {daysList.map((day) => {
          const d = dailyDataMap[day];
          const isSelected = selectedDay === day;
          const heightPercent = maxKits > 0 && d.kits > 0
            ? Math.min(100, Math.max(20, (d.kits / maxKits) * 100))
            : 10;

          return (
            <div
              key={day}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              title={`${d.fullName}: ${d.kits} kits (₹${d.amount.toLocaleString('en-IN')}) - Click to inspect`}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              {/* Kit Count Badge */}
              <span style={{
                fontSize: '0.68rem',
                fontWeight: isSelected ? 900 : 700,
                color: isSelected ? '#008A2E' : d.kits > 0 ? '#1E293B' : '#94A3B8',
                transition: 'color 0.2s ease'
              }}>
                {d.kits > 0 ? d.kits : '-'}
              </span>

              {/* Bar Element */}
              <div
                style={{
                  width: '100%',
                  height: `${heightPercent}%`,
                  background: isSelected
                    ? 'linear-gradient(180deg, #008A2E 0%, #166534 100%)'
                    : d.kits > 0
                    ? '#42B06F'
                    : '#E2E8F0',
                  borderRadius: 4,
                  boxShadow: isSelected
                    ? '0 0 0 2.5px #86EFAC, 0 4px 8px rgba(0, 138, 46, 0.25)'
                    : 'none',
                  transform: isSelected ? 'scaleY(1.05)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              />

              {/* Day Label */}
              <span style={{
                fontSize: '0.72rem',
                fontWeight: isSelected ? 900 : 600,
                color: isSelected ? '#008A2E' : '#64748B',
                background: isSelected ? '#EBF7EE' : 'transparent',
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                transition: 'all 0.2s ease'
              }}>
                {day}
              </span>
            </div>
          );
        })}
      </div>

      {/* Selected Day Details Panel */}
      {activeDayData && (
        <div style={{
          marginTop: 14,
          background: '#FFFFFF',
          border: '1.5px solid #86EFAC',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 16px',
          boxShadow: '0 4px 16px rgba(0, 138, 46, 0.08)',
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: 'var(--radius-full)',
                background: '#EBF7EE',
                color: '#008A2E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Calendar size={15} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {activeDayData.fullName} Collections Overview
                </h4>
                <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                  Detailed metrics and receipts for {activeDayData.fullName}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedDay(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: 4
              }}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Key Metrics Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
            gap: 8,
            marginBottom: 14
          }}>
            <div style={{
              background: '#F0FDF4',
              padding: '10px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #BBF7D0'
            }}>
              <span style={{ fontSize: '0.68rem', color: '#166534', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                Kits Collected
              </span>
              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#008A2E' }}>
                {activeDayData.kits} Kits
              </span>
            </div>

            <div style={{
              background: '#F8FAFC',
              padding: '10px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}>
              <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                Amount Raised
              </span>
              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0F172A' }}>
                ₹{activeDayData.amount.toLocaleString('en-IN')}
              </span>
            </div>

            <div style={{
              background: '#F8FAFC',
              padding: '10px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}>
              <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                Receipts Logged
              </span>
              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#2C82C9' }}>
                {activeDayData.donations.length}
              </span>
            </div>

            <div style={{
              background: '#F8FAFC',
              padding: '10px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}>
              <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                Weekly Share
              </span>
              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#D97706' }}>
                {totalWeeklyKits > 0 ? Math.round((activeDayData.kits / totalWeeklyKits) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Receipts / Donors List for that day */}
         
        </div>
      )}
    </div>
  );
};
