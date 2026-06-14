import { useState } from 'react';
import KpiCard from '../../components/KpiCard.jsx';

const ACTIVE_STATUSES = ['Aktif', 'active', 'approved', 'Published', 'Siap export'];
const DRAFT_STATUSES = ['Draft', 'draft', 'submitted'];

function makeRecord([name, meta, status], index, title) {
  return {
    id: `${title}-${index}-${name}`.toLowerCase().replace(/\s+/g, '-'),
    name,
    meta,
    status,
  };
}

export default function AdminOpdPage({ kicker, title, badge, description, rows }) {
  const [records, setRecords] = useState(rows.map((row, i) => makeRecord(row, i, title)));
  const [draft, setDraft] = useState({ name: '', meta: '', status: 'Draft' });
  const [editingId, setEditingId] = useState(null);
  const editing = records.find((record) => record.id === editingId);

  const metrics = [
    ['Total', records.length, `Data ${title.toLowerCase()} dalam scope OPD`],
    ['Active', records.filter((r) => ACTIVE_STATUSES.includes(r.status)).length, 'Siap digunakan'],
    ['Draft/Pending', records.filter((r) => DRAFT_STATUSES.includes(r.status)).length, 'Perlu tindak lanjut'],
  ];

  const resetForm = () => {
    setDraft({ name: '', meta: '', status: 'Draft' });
    setEditingId(null);
  };

  const submitRecord = (event) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.meta.trim()) return;

    if (editingId) {
      setRecords((current) => current.map((record) => (record.id === editingId ? { ...record, ...draft } : record)));
    } else {
      setRecords((current) => [{ id: `${title}-${Date.now()}`, ...draft }, ...current]);
    }
    resetForm();
  };

  const editRecord = (record) => {
    setEditingId(record.id);
    setDraft({ name: record.name, meta: record.meta, status: record.status });
  };

  const deleteRecord = (recordId) => {
    setRecords((current) => current.filter((record) => record.id !== recordId));
    if (editingId === recordId) resetForm();
  };

  return (
    <div className="page-stack">
      <div className="page-head">
        <p className="mono-kicker text-muted">{kicker}</p>
        <h1>{title}</h1>
      </div>

      <section className="enterprise-card">
        <div className="section-title">
          <h2>{title}</h2>
          <span className="badge-active">{badge}</span>
        </div>
        <div className="resource-note">{description}</div>
      </section>

      <div className="admin-mini-grid">
        {metrics.map(([label, value, note]) => (
          <KpiCard key={label} label={label} value={value} note={note} />
        ))}
      </div>

      <section className="enterprise-card">
        <div className="section-title">
          <div>
            <p className="mono-kicker text-muted">{editing ? 'Update Record' : 'Create Record'}</p>
            <h2>{editing ? editing.name : `New ${title}`}</h2>
          </div>
          {editing && <button className="outline-button compact" onClick={resetForm}>Cancel Edit</button>}
        </div>
        <form className="crud-form" onSubmit={submitRecord}>
          <label>
            <span>Name</span>
            <input value={draft.name} onChange={(e) => setDraft((c) => ({ ...c, name: e.target.value }))} placeholder={`Nama ${title.toLowerCase()}`} />
          </label>
          <label>
            <span>Meta</span>
            <input value={draft.meta} onChange={(e) => setDraft((c) => ({ ...c, meta: e.target.value }))} placeholder="Role, tipe, kategori, atau jumlah peserta" />
          </label>
          <label>
            <span>Status</span>
            <select value={draft.status} onChange={(e) => setDraft((c) => ({ ...c, status: e.target.value }))}>
              <option>Aktif</option>
              <option>Draft</option>
              <option>submitted</option>
              <option>approved</option>
              <option>active</option>
              <option>scheduled</option>
              <option>Published</option>
              <option>Siap export</option>
            </select>
          </label>
          <button className="primary-button compact">{editing ? 'Update' : 'Create'}</button>
        </form>
      </section>

      <section className="enterprise-card">
        <div className="section-title">
          <h2>Operational List</h2>
          <span className="badge-active">{records.length} RECORDS</span>
        </div>
        <div className="work-list">
          {records.map((record) => (
            <div className="work-row crud-row" key={record.id}>
              <div>
                <strong>{record.name}</strong>
                <span>{record.meta}</span>
              </div>
              <em>{record.status}</em>
              <div className="crud-actions">
                <button className="outline-button compact" onClick={() => editRecord(record)}>Edit</button>
                <button className="outline-button compact danger-lite" onClick={() => deleteRecord(record.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
