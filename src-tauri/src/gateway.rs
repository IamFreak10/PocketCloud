use crate::dns::DnsEngine;
use axum::{
    extract::{Path, State},
    http::{header, HeaderMap, StatusCode},
    response::{Html, IntoResponse},
    routing::get,
    Router,
};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::{Arc, RwLock};
use tokio::net::TcpListener;



#[derive(Clone)]
pub struct GatewayState {
    pub routes: Arc<RwLock<HashMap<String, u16>>>,
    pub component_ports: Arc<RwLock<HashMap<String, u16>>>,
    pub dns: Arc<DnsEngine>,
}

pub struct HostGateway {
    pub state: GatewayState,
    port: u16,
}

impl HostGateway {
    pub fn new(port: u16, dns: Arc<DnsEngine>) -> Self {
        HostGateway {
            state: GatewayState {
                routes: Arc::new(RwLock::new(HashMap::new())),
                component_ports: Arc::new(RwLock::new(HashMap::new())),
                dns,
            },
            port,
        }
    }

    pub fn register_route(&self, domain: &str, host_port: u16) {
        let mut routes = self.state.routes.write().unwrap();
        routes.insert(domain.to_lowercase(), host_port);
    }

    pub fn unregister_route(&self, domain: &str) {
        let mut routes = self.state.routes.write().unwrap();
        routes.remove(&domain.to_lowercase());
    }

    pub fn register_component(&self, component_id: &str, host_port: u16) {
        let mut ports = self.state.component_ports.write().unwrap();
        ports.insert(component_id.to_string(), host_port);
    }

    pub async fn start(&self) -> Result<(), String> {
        let state = self.state.clone();
        let port = self.port;

        let app = Router::new()
            .route("/", get(dashboard_handler))
            .route("/health", get(|| async { "NetLab Gateway OK" }))
            .route("/browse", get(browse_handler))
            .route("/proxy/{component_id}/{port}", get(component_proxy_handler))
            .fallback(dynamic_host_handler)
            .with_state(state);

        tokio::spawn(async move {
            let addr = SocketAddr::from(([127, 0, 0, 1], port));
            if let Ok(listener) = TcpListener::bind(addr).await {
                let _ = axum::serve(listener, app).await;
            }
        });

        Ok(())
    }
}
use axum::extract::Query;

#[axum::debug_handler]
async fn browse_handler(
    Query(params): Query<HashMap<String, String>>,
    State(state): State<GatewayState>,
) -> impl IntoResponse {
    let target_url = params
        .get("url")
        .cloned()
        .unwrap_or_else(|| "shop.test".to_string());
    let cleaned = target_url
        .trim_start_matches("http://")
        .trim_start_matches("https://");
    let mut parts = cleaned.splitn(2, '/');
    let host_part = parts.next().unwrap_or("");
    let uri_path = format!("/{}", parts.next().unwrap_or(""));

    let (domain, explicit_port) = if let Some((d, p_str)) = host_part.split_once(':') {
        (d.to_lowercase(), p_str.parse::<u16>().ok())
    } else {
        (host_part.to_lowercase(), None)
    };

    // 1. Resolve via explicit port, DNS Engine, or Routes without holding lock across await
    let resolved_port = if let Some(port) = explicit_port {
        Some(port)
    } else if let Some(record) = state.dns.resolve(&domain) {
        Some(record.host_port)
    } else {
        let routes = state.routes.read().unwrap();
        routes.get(&domain).cloned().or_else(|| {
            if domain.ends_with(".test") || domain == "localhost" || domain == "127.0.0.1" {
                Some(8080)
            } else {
                None
            }
        })
    };

    if let Some(host_port) = resolved_port {
        let mut res = forward_to_port(host_port, &uri_path, &domain).await;
        res.headers_mut().insert("X-NetLab-DNS-Resolved", domain.parse().unwrap());
        res.headers_mut().insert("X-NetLab-Target-Port", host_port.to_string().parse().unwrap());
        res.headers_mut().insert("Access-Control-Allow-Origin", "*".parse().unwrap());
        res
    } else {
        let error_html = format!(
            r#"<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>DNS Error: NXDOMAIN</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 flex items-center justify-center min-h-screen p-6 font-sans">
    <div class="max-w-lg bg-slate-900 border border-rose-800/80 rounded-2xl p-8 shadow-2xl">
        <div class="flex items-center gap-3 text-rose-400 mb-4">
            <span class="text-3xl">⚠️</span>
            <h1 class="text-2xl font-black tracking-tight">DNS NXDOMAIN</h1>
        </div>
        <p class="text-sm text-slate-300 leading-relaxed mb-4">
            Domain <code class="text-rose-300 bg-slate-800 px-2 py-0.5 rounded font-mono font-bold">{}</code> cannot be resolved because no authoritative DNS record exists in NetLab.
        </p>
        <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-400 mb-6">
            <div class="text-cyan-400 font-bold mb-1">💡 How to fix:</div>
            <div>1. Open NetLab &gt; <b>Domains & DNS</b> tab.</div>
            <div>2. Add an <b>A Record</b> for <code>{}</code>.</div>
            <div>3. Point it to your running Web Server or VPS node.</div>
        </div>
        <a href="/" class="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition">
            &larr; Return to NetLab Gateway
        </a>
    </div>
</body>
</html>"#,
            domain, domain
        );
        (
            StatusCode::NOT_FOUND,
            [
                (header::CONTENT_TYPE, "text/html; charset=utf-8"),
                (header::ACCESS_CONTROL_ALLOW_ORIGIN, "*"),
            ],
            error_html,
        )
            .into_response()
    }
}

async fn dashboard_handler(State(state): State<GatewayState>) -> Html<String> {
    let routes = state.routes.read().unwrap();
    let comp_ports = state.component_ports.read().unwrap();

    let mut routes_html = String::new();
    if routes.is_empty() {
        routes_html.push_str("<tr><td colspan='3' class='p-3 text-gray-500'>No active virtual domain routes yet. Deploy a lab component to create one!</td></tr>");
    } else {
        for (domain, port) in routes.iter() {
            routes_html.push_str(&format!(
                "<tr class='border-b border-gray-800'><td class='p-3 font-mono text-cyan-400'>{}</td><td class='p-3 text-emerald-400 font-mono'>127.0.0.1:{}</td><td class='p-3'><a href='http://127.0.0.1:{}/' target='_blank' class='px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-sm'>Open Direct</a></td></tr>",
                domain, port, port
            ));
        }
    }

    let mut comps_html = String::new();
    for (comp, port) in comp_ports.iter() {
        comps_html.push_str(&format!(
            "<tr class='border-b border-gray-800'><td class='p-3 font-mono text-blue-400'>{}</td><td class='p-3 text-emerald-400 font-mono'>:{}</td><td class='p-3'><a href='http://127.0.0.1:{}/' target='_blank' class='px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm'>Access</a></td></tr>",
            comp, port, port
        ));
    }

    let html = format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>NetLab Host-Browser Gateway</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-950 text-gray-100 min-h-screen p-8">
    <div class="max-w-4xl mx-auto">
        <header class="flex items-center justify-between pb-6 border-b border-gray-800 mb-8">
            <div>
                <h1 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                    NetLab Host-Browser Gateway
                </h1>
                <p class="text-gray-400 mt-1">Local Loopback Bridge (127.0.0.1:18080)</p>
            </div>
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                ● Gateway Online
            </span>
        </header>

        <section class="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8 shadow-xl">
            <h2 class="text-xl font-bold mb-4 flex items-center gap-2 text-cyan-400">
                Active Virtual Domain Routes
            </h2>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="text-gray-400 border-b border-gray-800">
                        <tr>
                            <th class="p-3">Domain</th>
                            <th class="p-3">Internal Target</th>
                            <th class="p-3">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {}
                    </tbody>
                </table>
            </div>
        </section>

        <section class="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
            <h2 class="text-xl font-bold mb-4 flex items-center gap-2 text-blue-400">
                Running Lab Component Web Endpoints
            </h2>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="text-gray-400 border-b border-gray-800">
                        <tr>
                            <th class="p-3">Component ID</th>
                            <th class="p-3">Port</th>
                            <th class="p-3">Direct Link</th>
                        </tr>
                    </thead>
                    <tbody>
                        {}
                    </tbody>
                </table>
            </div>
        </section>
    </div>
</body>
</html>"#,
        routes_html, comps_html
    );

    Html(html)
}

async fn component_proxy_handler(
    Path((_component_id, port)): Path<(String, u16)>,
) -> axum::response::Response {
    forward_to_port(port, "/", "127.0.0.1").await
}

async fn dynamic_host_handler(
    State(state): State<GatewayState>,
    headers: HeaderMap,
    req: axum::extract::Request,
) -> axum::response::Response {
    let host_header = headers
        .get(header::HOST)
        .and_then(|h| h.to_str().ok())
        .unwrap_or("");

    let domain = host_header.split(':').next().unwrap_or("").to_lowercase();
    let uri_path = req.uri().path_and_query().map(|pq| pq.as_str()).unwrap_or("/");

    let target_port = {
        if let Some(record) = state.dns.resolve(&domain) {
            Some(record.host_port)
        } else {
            let routes = state.routes.read().unwrap();
            routes.get(&domain).cloned().or_else(|| {
                if domain.ends_with(".test") || domain == "localhost" || domain == "127.0.0.1" {
                    Some(8080)
                } else {
                    None
                }
            })
        }
    };

    if let Some(port) = target_port {
        forward_to_port(port, uri_path, &domain).await
    } else {
        let error_html = format!(
            r#"<!DOCTYPE html><html><head><title>502 Bad Gateway / NXDOMAIN</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-950 text-slate-200 p-8 flex items-center justify-center min-h-screen"><div class="bg-slate-900 border border-slate-800 p-6 rounded-xl max-w-md"><h1 class="text-xl font-bold text-rose-400 mb-2">502 Bad Gateway / Route Not Found</h1><p class="text-xs text-slate-400 mb-4">Domain <code>{}</code> is not mapped to any running lab component in NetLab.</p><a href="/" class="text-cyan-400 text-xs hover:underline">&larr; View Active Routes on NetLab Gateway</a></div></body></html>"#,
            domain
        );
        (
            StatusCode::NOT_FOUND,
            [
                (header::CONTENT_TYPE, "text/html; charset=utf-8"),
                (header::ACCESS_CONTROL_ALLOW_ORIGIN, "*"),
            ],
            error_html,
        )
            .into_response()
    }
}

async fn forward_to_port(port: u16, path: &str, host_header: &str) -> axum::response::Response {
    match reqwest_stream_fetch(port, path, host_header).await {
        Ok((status, content_type, body_bytes)) => {
            let ct = content_type.unwrap_or_else(|| "text/html; charset=utf-8".to_string());
            (
                status,
                [
                    (header::CONTENT_TYPE, ct.as_str()),
                    (header::ACCESS_CONTROL_ALLOW_ORIGIN, "*"),
                ],
                body_bytes,
            )
                .into_response()
        }
        Err(err) => {
            let error_html = format!(
                r#"<!DOCTYPE html><html><head><title>502 Connection Refused</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-950 text-slate-200 p-8 flex items-center justify-center min-h-screen"><div class="bg-slate-900 border border-amber-800/80 p-6 rounded-xl max-w-md"><h1 class="text-xl font-bold text-amber-400 mb-2">502 Connection Refused</h1><p class="text-xs text-slate-300 mb-4">Failed to connect to internal container on <code>127.0.0.1:{}</code>: {}</p><p class="text-[11px] text-slate-500">Make sure your container or web service is running and listening on the mapped port.</p></div></body></html>"#,
                port, err
            );
            (
                StatusCode::BAD_GATEWAY,
                [
                    (header::CONTENT_TYPE, "text/html; charset=utf-8"),
                    (header::ACCESS_CONTROL_ALLOW_ORIGIN, "*"),
                ],
                error_html,
            )
                .into_response()
        }
    }
}

async fn reqwest_stream_fetch(port: u16, path: &str, host_header: &str) -> Result<(StatusCode, Option<String>, Vec<u8>), String> {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpStream;

    let target_addr = format!("127.0.0.1:{}", port);
    let mut stream = TcpStream::connect(&target_addr)
        .await
        .map_err(|e| format!("Connect error: {}", e))?;

    let http_req = format!(
        "GET {} HTTP/1.1\r\nHost: {}\r\nUser-Agent: NetLabGateway/1.0\r\nConnection: close\r\n\r\n",
        path, host_header
    );

    stream
        .write_all(http_req.as_bytes())
        .await
        .map_err(|e| format!("Write error: {}", e))?;

    let mut response_bytes = Vec::new();
    stream
        .read_to_end(&mut response_bytes)
        .await
        .map_err(|e| format!("Read error: {}", e))?;

    let response_str = String::from_utf8_lossy(&response_bytes);
    let mut split_res = response_str.split("\r\n\r\n");
    let headers_part = split_res.next().unwrap_or("");
    let body_offset = headers_part.len() + 4;

    let status = if let Some(first_line) = headers_part.lines().next() {
        let code_str = first_line.split_whitespace().nth(1).unwrap_or("200");
        code_str
            .parse::<u16>()
            .ok()
            .and_then(|c| StatusCode::from_u16(c).ok())
            .unwrap_or(StatusCode::OK)
    } else {
        StatusCode::OK
    };

    let content_type = headers_part
        .lines()
        .find(|l| l.to_lowercase().starts_with("content-type:"))
        .map(|l| l.split(':').nth(1).unwrap_or("text/html").trim().to_string());

    let body = if response_bytes.len() >= body_offset {
        response_bytes[body_offset..].to_vec()
    } else {
        response_bytes
    };

    Ok((status, content_type, body))
}
