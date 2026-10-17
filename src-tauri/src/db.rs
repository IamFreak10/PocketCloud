use crate::models::{GatewayRoute, Lab, LabComponent};
use rusqlite::{Connection, Result, params};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new() -> Result<Self> {
        let db_path = get_db_path();
        if let Some(parent) = db_path.parent() {
            let _ = fs::create_dir_all(parent);
        }

        let conn = Connection::open(&db_path)?;
        let db = Database {
            conn: Mutex::new(conn),
        };
        db.init_schema()?;
        Ok(db)
    }

    fn init_schema(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS labs (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS components (
                id TEXT PRIMARY KEY,
                lab_id TEXT NOT NULL,
                name TEXT NOT NULL,
                component_type TEXT NOT NULL,
                runtime_mode TEXT NOT NULL,
                image TEXT NOT NULL,
                status TEXT NOT NULL,
                container_id TEXT,
                ip_address TEXT,
                host_port INTEGER,
                container_port INTEGER,
                created_at TEXT NOT NULL,
                FOREIGN KEY(lab_id) REFERENCES labs(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS routes (
                id TEXT PRIMARY KEY,
                lab_id TEXT NOT NULL,
                domain TEXT NOT NULL,
                target_component_id TEXT NOT NULL,
                target_port INTEGER NOT NULL,
                host_port INTEGER NOT NULL,
                FOREIGN KEY(lab_id) REFERENCES labs(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS mission_progress (
                mission_id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                completed_at TEXT NOT NULL
            );
            ",
        )?;
        Ok(())
    }

    pub fn save_lab(&self, lab: &Lab) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO labs (id, name, description, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![lab.id, lab.name, lab.description, lab.status, lab.created_at],
        )?;

        for c in &lab.components {
            conn.execute(
                "INSERT OR REPLACE INTO components (id, lab_id, name, component_type, runtime_mode, image, status, container_id, ip_address, host_port, container_port, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                params![c.id, c.lab_id, c.name, c.component_type, c.runtime_mode, c.image, c.status, c.container_id, c.ip_address, c.host_port, c.container_port, c.created_at],
            )?;
        }

        for r in &lab.routes {
            conn.execute(
                "INSERT OR REPLACE INTO routes (id, lab_id, domain, target_component_id, target_port, host_port)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![r.id, r.lab_id, r.domain, r.target_component_id, r.target_port, r.host_port],
            )?;
        }

        Ok(())
    }

    pub fn list_labs(&self) -> Result<Vec<Lab>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, description, status, created_at FROM labs ORDER BY created_at DESC",
        )?;
        let lab_iter = stmt.query_map([], |row| {
            Ok(Lab {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                status: row.get(3)?,
                created_at: row.get(4)?,
                components: Vec::new(),
                routes: Vec::new(),
            })
        })?;

        let mut labs = Vec::new();
        for lab_res in lab_iter {
            let mut lab = lab_res?;
            // load components
            let mut comp_stmt = conn.prepare(
                "SELECT id, lab_id, name, component_type, runtime_mode, image, status, container_id, ip_address, host_port, container_port, created_at 
                 FROM components WHERE lab_id = ?1",
            )?;
            let comp_iter = comp_stmt.query_map(params![lab.id], |row| {
                Ok(LabComponent {
                    id: row.get(0)?,
                    lab_id: row.get(1)?,
                    name: row.get(2)?,
                    component_type: row.get(3)?,
                    runtime_mode: row.get(4)?,
                    image: row.get(5)?,
                    status: row.get(6)?,
                    container_id: row.get(7)?,
                    ip_address: row.get(8)?,
                    host_port: row.get(9)?,
                    container_port: row.get(10)?,
                    created_at: row.get(11)?,
                })
            })?;
            for comp in comp_iter {
                lab.components.push(comp?);
            }

            // load routes
            let mut route_stmt = conn.prepare(
                "SELECT id, lab_id, domain, target_component_id, target_port, host_port 
                 FROM routes WHERE lab_id = ?1",
            )?;
            let route_iter = route_stmt.query_map(params![lab.id], |row| {
                Ok(GatewayRoute {
                    id: row.get(0)?,
                    lab_id: row.get(1)?,
                    domain: row.get(2)?,
                    target_component_id: row.get(3)?,
                    target_port: row.get(4)?,
                    host_port: row.get(5)?,
                })
            })?;
            for route in route_iter {
                lab.routes.push(route?);
            }

            labs.push(lab);
        }

        Ok(labs)
    }

    pub fn delete_lab(&self, lab_id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM routes WHERE lab_id = ?1", params![lab_id])?;
        conn.execute("DELETE FROM components WHERE lab_id = ?1", params![lab_id])?;
        conn.execute("DELETE FROM labs WHERE id = ?1", params![lab_id])?;
        Ok(())
    }
}

fn get_db_path() -> PathBuf {
    if let Ok(home) = std::env::var("HOME") {
        PathBuf::from(home).join(".local/share/netlab/netlab-v2.db")
    } else if let Ok(appdata) = std::env::var("APPDATA") {
        PathBuf::from(appdata).join("netlab/netlab-v2.db")
    } else if let Ok(userprofile) = std::env::var("USERPROFILE") {
        PathBuf::from(userprofile).join(".netlab/netlab-v2.db")
    } else {
        PathBuf::from("netlab-v2.db")
    }
}
