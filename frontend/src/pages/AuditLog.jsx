import { useEffect, useState } from 'react'
import { getAuditLog } from '../api/client'
import { Search } from 'lucide-react'
const ACTION_BADGE = {
  INSERT: 's-green',
  UPDATE: 's-blue',
  DELETE: 's-red',
}

export default function AuditLog() {
  const [rows,   setRows]   = useState([])
  const [table,  setTable]  = useState('')
  const [action, setAction] = useState('')
  const [search, setSearch] = useState('')
  const [error,  setError]  = useState('')

  useEffect(() => {
    const params = {}
    if (table)  params.table  = table
    if (action) params.action = action
    if (search) params.search = search

    getAuditLog(params)
      .then(r => setRows(r.data))
      .catch(e => setError(e.message))
  }, [table, action, search])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <div style={{ color: '#ff3b30', fontSize: 13 }}>{error}</div>}

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aeaeb2' }} />
          <input className="input" style={{ paddingLeft: 34 }} placeholder="Search description…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <input className="input" style={{ width: 160 }} placeholder="Table name…"
          value={table} onChange={e => setTable(e.target.value)} />
        <select className="input" style={{ width: 140 }} value={action}
          onChange={e => setAction(e.target.value)}>
          <option value="">All actions</option>
          <option>INSERT</option>
          <option>UPDATE</option>
          <option>DELETE</option>
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th className="table-th">ID</th>
              <th className="table-th">Table</th>
              <th className="table-th">Action</th>
              <th className="table-th">Record</th>
              <th className="table-th">Changed By</th>
              <th className="table-th">Description</th>
              <th className="table-th">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0
              ? (
                <tr>
                  <td colSpan={7} className="table-td" style={{ textAlign: 'center', color: '#aeaeb2', padding: '40px 0' }}>
                    No audit records found
                  </td>
                </tr>
              )
              : rows.map(r => (
                <tr key={r.LOG_ID}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9f9fb'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td className="table-td" style={{ fontFamily: 'monospace', fontSize: 11, color: '#aeaeb2' }}>{r.LOG_ID}</td>
                  <td className="table-td" style={{ fontFamily: 'monospace', fontSize: 11, color: '#3a3a3c' }}>{r.TABLE_NAME}</td>
                  <td className="table-td">
                    <span className={`badge ${ACTION_BADGE[r.ACTION] ?? 's-gray'}`}>{r.ACTION}</span>
                  </td>
                  <td className="table-td" style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.RECORD_ID}</td>
                  <td className="table-td" style={{ fontSize: 12 }}>{r.CHANGED_BY ?? '—'}</td>
                  <td className="table-td" style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#6e6e73', fontSize: 12 }}>
                    {r.DESCRIPTION}
                  </td>
                  <td className="table-td" style={{ fontSize: 11, color: '#aeaeb2', whiteSpace: 'nowrap' }}>{r.CHANGED_AT}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 12, color: '#aeaeb2' }}>
        Showing {rows.length} record{rows.length !== 1 ? 's' : ''}
        {rows.length === 100 && ' — capped at 100; use filters to narrow'}
      </div>
    </div>
  )
}
