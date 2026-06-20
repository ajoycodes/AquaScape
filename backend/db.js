import oracledb from 'oracledb'

let pool = null

export async function initPool(retries = 10, delayMs = 5000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      pool = await oracledb.createPool({
        user:          process.env.ORACLE_USER     || 'AQUASCAPE',
        password:      process.env.ORACLE_PASSWORD || 'AquaScape123',
        connectString: `${process.env.ORACLE_HOST || '127.0.0.1'}:${process.env.ORACLE_PORT || 1521}/${process.env.ORACLE_SERVICE || 'XEPDB1'}`,
        poolMin:       2,
        poolMax:       10,
        poolIncrement: 1,
      })
      console.log('[db] Oracle pool created')
      return
    } catch (err) {
      console.error(`[db] Connection attempt ${attempt}/${retries} failed:`, err.message)
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, delayMs))
      } else {
        throw err
      }
    }
  }
}

export async function query(sql, binds = {}, opts = {}) {
  const conn = await pool.getConnection()
  try {
    const result = await conn.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      fetchArraySize: 500,
      ...opts,
    })
    return result.rows ?? []
  } finally {
    await conn.close()
  }
}

export async function execute(sql, binds = {}) {
  const conn = await pool.getConnection()
  try {
    return await conn.execute(sql, binds, { autoCommit: true })
  } finally {
    await conn.close()
  }
}

export async function callProc(sql, binds = {}) {
  const conn = await pool.getConnection()
  try {
    const result = await conn.execute(sql, binds, { autoCommit: true })
    return result.outBinds ?? {}
  } finally {
    await conn.close()
  }
}

export { oracledb }
