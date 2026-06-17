import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="auth">
      <div className="card auth__card">
        <h1>404</h1>
        <p className="muted">This page doesn’t exist.</p>
        <Link to="/tenants">Go to tenants</Link>
      </div>
    </div>
  );
}
