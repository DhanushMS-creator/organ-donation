import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import PatientRegistration from './pages/PatientRegistration.jsx'
import PatientRegistry from './pages/PatientRegistry.jsx'
import OrganInventory from './pages/OrganInventory.jsx'
import PriorityAlerts from './pages/PriorityAlerts.jsx'
import Transplants from './pages/Transplants.jsx'
import Transports from './pages/Transports.jsx'
import UnmatchedOrgans from './pages/UnmatchedOrgans.jsx'
import BangaloreMap from './pages/BangaloreMap.jsx'
import Login from './pages/Login.jsx'
import SecureMessages from './pages/SecureMessages.jsx'
import { getCurrentUser } from './auth.js'
import { getMatch, isMatchExpired } from './matchState.js'

function RequireAuth({ children }) {
  const loc = useLocation()
  const user = getCurrentUser()
  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  }

  const m = getMatch()
  if (isMatchExpired(m) && loc.pathname !== '/unmatched-organs') {
    return <Navigate to="/unmatched-organs" replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={<Navigate to={getCurrentUser() ? '/dashboard' : '/login'} replace />}
      />

      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/patients"
        element={
          <RequireAuth>
            <PatientRegistry />
          </RequireAuth>
        }
      />
      <Route
        path="/patients/new"
        element={
          <RequireAuth>
            <PatientRegistration />
          </RequireAuth>
        }
      />
      <Route
        path="/inventory"
        element={
          <RequireAuth>
            <OrganInventory />
          </RequireAuth>
        }
      />
      <Route
        path="/alerts"
        element={
          <RequireAuth>
            <PriorityAlerts />
          </RequireAuth>
        }
      />
      <Route
        path="/matching"
        element={
          <RequireAuth>
            <Transplants />
          </RequireAuth>
        }
      />
      <Route
        path="/logistics"
        element={
          <RequireAuth>
            <Transports />
          </RequireAuth>
        }
      />
      <Route
        path="/messages"
        element={
          <RequireAuth>
            <SecureMessages />
          </RequireAuth>
        }
      />
      <Route
        path="/unmatched-organs"
        element={
          <RequireAuth>
            <UnmatchedOrgans />
          </RequireAuth>
        }
      />

      {/* Backwards compatible routes */}
      <Route path="/transplants" element={<Navigate to="/matching" replace />} />
      <Route path="/transports" element={<Navigate to="/logistics" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
      <Route
        path="/bangalore-south"
        element={
          <RequireAuth>
            <BangaloreMap />
          </RequireAuth>
        }
      />
    </Routes>
  )
}
