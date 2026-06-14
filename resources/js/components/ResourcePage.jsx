export default function ResourcePage({ title, endpoint }) {
  return (
    <section className="enterprise-card">
      <div className="section-title">
        <div>
          <p className="mono-kicker text-muted">Resource</p>
          <h2>{title}</h2>
        </div>
        <button className="primary-button">Create</button>
      </div>
      <div className="resource-note">
        Connects to <code>{endpoint}</code> with Sanctum Bearer authentication.
      </div>
    </section>
  );
}
