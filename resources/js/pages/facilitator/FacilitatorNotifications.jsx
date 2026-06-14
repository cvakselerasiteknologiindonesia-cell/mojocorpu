import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Award, Bell, CheckCheck, Coins, CalendarDays,
  ShoppingBag, TrendingUp, XCircle, CheckCircle,
} from 'lucide-react';
import api from '../../api.js';

const TYPE_META = {
  assessment_result: { icon: TrendingUp,   color: '#2563eb', bg: '#eff6ff' },
  badge_earned:      { icon: Award,         color: '#7c3aed', bg: '#f5f3ff' },
  wallet_topup:      { icon: Coins,         color: '#16a34a', bg: '#f0fdf4' },
  token_credit:      { icon: Coins,         color: '#16a34a', bg: '#f0fdf4' },
  token_debit:       { icon: Coins,         color: '#dc2626', bg: '#fef2f2' },
  store_fulfilled:   { icon: CheckCircle,   color: '#16a34a', bg: '#f0fdf4' },
  store_cancelled:   { icon: XCircle,       color: '#dc2626', bg: '#fef2f2' },
  event_assigned:    { icon: CalendarDays,  color: '#0891b2', bg: '#ecfeff' },
  proposal_approved: { icon: CheckCircle,   color: '#16a34a', bg: '#f0fdf4' },
  proposal_rejected: { icon: XCircle,       color: '#dc2626', bg: '#fef2f2' },
  store_purchase:    { icon: ShoppingBag,   color: '#ec4899', bg: '#fdf2f8' },
  system:            { icon: Bell,          color: '#6b7280', bg: '#f9fafb' },
};

function formatTime(d) {
  if (!d) return '';
  const date = new Date(d);
  const now  = new Date();
  const diff  = Math.floor((now - date) / 1000);
  if (diff < 60)     return 'Baru saja';
  if (diff < 3600)   return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)} jam lalu`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function NotifIcon({ type, isRead }) {
  const meta = TYPE_META[type] || TYPE_META.system;
  const Ic   = meta.icon;
  return (
    <div style={{
      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
      background: isRead ? '#f3f4f6' : meta.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Ic size={18} color={isRead ? '#9ca3af' : meta.color} />
    </div>
  );
}

export default function FacilitatorNotifications() {
  const qc       = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications?per_page=50').then((r) => r.data.data),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const notifications = data?.data ?? [];

  const markRead = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notif-unread-count'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notif-unread-count'] });
    },
  });

  const handleClick = (n) => {
    if (!n.is_read) markRead.mutate(n.id);
    if (n.link) navigate(n.link);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Bell size={24} color="#7c3aed" />
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>Notifikasi</h1>
            {unreadCount > 0 && (
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{unreadCount} belum dibaca</p>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb',
              background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
            }}>
            <CheckCheck size={14} />
            {markAllRead.isPending ? 'Memproses…' : 'Tandai semua dibaca'}
          </button>
        )}
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Memuat notifikasi…</div>
      )}

      {!isLoading && notifications.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 0',
          background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 14,
        }}>
          <Bell size={36} color="#d1d5db" style={{ margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontSize: 14, color: '#9ca3af', margin: 0 }}>Tidak ada notifikasi saat ini.</p>
        </div>
      )}

      {notifications.length > 0 && (
        <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
          {notifications.map((n, i) => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              style={{
                display: 'flex', gap: 14, padding: '14px 18px',
                borderBottom: i < notifications.length - 1 ? '1px solid #f3f4f6' : 'none',
                background: n.is_read ? '#fff' : '#faf5ff',
                cursor: (n.link || !n.is_read) ? 'pointer' : 'default',
                transition: 'background 0.15s',
              }}
            >
              <NotifIcon type={n.type} isRead={n.is_read} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 3 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: n.is_read ? 500 : 700, color: '#111827' }}>
                    {n.title}
                  </p>
                  <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {formatTime(n.created_at)}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{n.message}</p>
                {n.link && (
                  <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600, marginTop: 4, display: 'inline-block' }}>
                    Lihat detail →
                  </span>
                )}
              </div>

              {!n.is_read && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', flexShrink: 0, marginTop: 6 }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
