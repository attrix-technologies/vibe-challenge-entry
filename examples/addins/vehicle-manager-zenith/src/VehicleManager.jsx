// Part of Geotab Vibe Guide: https://github.com/fhoffa/geotab-vibe-guide
import React, { useState, useEffect } from 'react';
import {
  Button,
  TextInput,
  FeedbackProvider,
  Alert,
  Waiting
} from '@geotab/zenith';
import '@geotab/zenith/dist/index.css';

function VehicleManager({ api }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState('...');

  // Load data on mount
  useEffect(() => {
    if (api) {
      loadData();
    }
  }, [api]);

  function loadData() {
    if (!api) return;

    setLoading(true);
    setError(null);

    // Get session info
    api.getSession(function(session) {
      setUsername(session.userName);
    });

    // Get vehicles
    api.call('Get', { typeName: 'Device' }, function(devices) {
      setVehicles(devices || []);
      setLoading(false);
    }, function(err) {
      setError('Failed to load vehicles: ' + (err.message || err));
      setLoading(false);
    });
  }

  function saveVehicleName(deviceId) {
    if (!api) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    api.call('Set', {
      typeName: 'Device',
      entity: { id: deviceId, name: editName }
    }, function() {
      // Update local state
      setVehicles(vehicles.map(function(v) {
        return v.id === deviceId ? Object.assign({}, v, { name: editName }) : v;
      }));
      setEditingId(null);
      setSaving(false);
      setSuccess('Vehicle name updated successfully!');
      setTimeout(function() { setSuccess(null); }, 3000);
    }, function(err) {
      setError('Failed to update vehicle name: ' + (err.message || err));
      setSaving(false);
    });
  }

  function startEdit(vehicle) {
    setEditingId(vehicle.id);
    setEditName(vehicle.name || '');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
  }

  // Styles
  var cardStyle = {
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #EDEBE9',
    marginBottom: '24px'
  };

  var tableStyle = {
    width: '100%',
    borderCollapse: 'collapse'
  };

  var thStyle = {
    textAlign: 'left',
    padding: '12px 16px',
    borderBottom: '1px solid #EDEBE9',
    color: '#605E5C',
    fontWeight: 600,
    fontSize: '13px'
  };

  var tdStyle = {
    padding: '12px 16px',
    borderBottom: '1px solid #EDEBE9'
  };

  return (
    <FeedbackProvider>
    <div style={{
      padding: '24px',
      fontFamily: '"Segoe UI", sans-serif',
      minHeight: '100vh',
      background: '#FAF9F8'
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            margin: 0,
            color: '#201F1E'
          }}>
            Vehicle Manager
          </h1>
          <p style={{
            margin: '4px 0 0 0',
            color: '#605E5C'
          }}>
            Connected as: {username}
          </p>
        </div>

        <Button
          variant="primary"
          onClick={loadData}
          disabled={loading}
        >
          Refresh
        </Button>
      </header>

      {/* Alerts */}
      {error && (
        <Alert
          variant="error"
          dismissible
          onDismiss={function() { setError(null); }}
          style={{ marginBottom: '16px' }}
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          variant="success"
          dismissible
          onDismiss={function() { setSuccess(null); }}
          style={{ marginBottom: '16px' }}
        >
          {success}
        </Alert>
      )}

      {/* Stats Card */}
      <div style={cardStyle}>
        <div style={{ padding: '16px' }}>
          <div style={{
            fontSize: '12px',
            color: '#605E5C',
            marginBottom: '4px'
          }}>
            Total Vehicles
          </div>
          <div style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#0078D4'
          }}>
            {loading ? '...' : vehicles.length}
          </div>
        </div>
      </div>

      {/* Vehicle Table */}
      <div style={cardStyle}>
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #EDEBE9'
        }}>
          <h2 style={{
            fontSize: '16px',
            fontWeight: 600,
            margin: 0
          }}>
            Manage Vehicles
          </h2>
        </div>

        {loading ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '48px'
          }}>
            <Waiting size="large" />
            <p style={{
              marginTop: '16px',
              color: '#605E5C'
            }}>
              Loading vehicles...
            </p>
          </div>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Serial Number</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(function(vehicle) {
                return (
                  <tr key={vehicle.id}>
                    <td style={tdStyle}>{vehicle.serialNumber || 'N/A'}</td>
                    <td style={tdStyle}>
                      {editingId === vehicle.id ? (
                        <TextInput
                          value={editName}
                          onChange={function(e) { setEditName(e.target.value); }}
                          placeholder="Enter vehicle name"
                          disabled={saving}
                        />
                      ) : (
                        vehicle.name || 'N/A'
                      )}
                    </td>
                    <td style={tdStyle}>
                      {editingId === vehicle.id ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Button
                            variant="primary"
                            onClick={function() { saveVehicleName(vehicle.id); }}
                            disabled={saving}
                          >
                            {saving ? 'Saving...' : 'Save'}
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={cancelEdit}
                            disabled={saving}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="secondary"
                          onClick={function() { startEdit(vehicle); }}
                        >
                          Edit
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
    </FeedbackProvider>
  );
}

export default VehicleManager;
