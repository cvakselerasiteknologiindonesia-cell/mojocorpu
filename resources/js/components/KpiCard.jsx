export default function KpiCard({ label, value, note, loading = false }) {
  return (
    <section className="kpi-card">
      <div className="kpi-value">{loading ? '-' : value}</div>
      <div className="kpi-label">{label}</div>
      <p>{note}</p>
      <div className="kpi-bar"><span /></div>
    </section>
  );
}
