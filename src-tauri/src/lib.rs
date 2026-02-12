use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use tauri::{Manager, State, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_updater::UpdaterExt;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuthSession {
    pub cookies: HashMap<String, String>,
    pub user_id: Option<String>,
    pub expires_at: i64,
}

#[derive(Clone)]
pub struct AuthState {
    pub session: Arc<Mutex<Option<AuthSession>>>,
    pub auth_webview_label: Arc<Mutex<Option<String>>>,
}

impl AuthState {
    pub fn new() -> Self {
        Self {
            session: Arc::new(Mutex::new(None)),
            auth_webview_label: Arc::new(Mutex::new(None)),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StreamInfo {
    pub id: String,
    pub title: String,
    pub description: String,
    pub sport: String,
    pub status: String,
    pub start_time: String,
    pub end_time: Option<String>,
    pub thumbnail_url: String,
    pub stream_url: String,
    pub requires_auth: bool,
    pub is_premium: bool,
}

mod commands {
    use super::*;
    use tauri::Emitter;

    #[tauri::command]
    pub async fn check_auth_status(
        state: State<'_, AuthState>,
    ) -> Result<Option<AuthSession>, String> {
        let session = state.session.lock().unwrap();
        Ok(session.clone())
    }

    #[tauri::command]
    pub async fn set_auth_session(
        session: AuthSession,
        state: State<'_, AuthState>,
    ) -> Result<(), String> {
        let mut sess = state.session.lock().unwrap();
        *sess = Some(session);
        Ok(())
    }

    #[tauri::command]
    pub async fn logout(state: State<'_, AuthState>) -> Result<(), String> {
        let mut session = state.session.lock().unwrap();
        *session = None;
        Ok(())
    }

    #[tauri::command]
    pub async fn start_cbc_auth(
        app: tauri::AppHandle,
        state: State<'_, AuthState>,
    ) -> Result<(), String> {
        const AUTH_URL: &str = "https://www.cbc.ca/account/login?returnto=https%3A%2F%2Fwww.cbc.ca%2F&referrer=https%3A%2F%2Fwww.cbc.ca%2F";

        // Check if auth window already exists
        if let Some(label) = state.auth_webview_label.lock().unwrap().as_ref() {
            if let Some(window) = app.get_webview_window(label) {
                let _ = window.set_focus();
                return Ok(());
            }
        }

        // Create a new webview window for authentication
        let label = "cbc_auth_window".to_string();

        let _webview = WebviewWindowBuilder::new(
            &app,
            &label,
            WebviewUrl::External(AUTH_URL.parse().unwrap()),
        )
        .title("Sign in with CBC")
        .inner_size(500.0, 700.0)
        .center()
        .resizable(true)
        .minimizable(false)
        .maximizable(false)
        .build()
        .map_err(|e| format!("Failed to create auth window: {}", e))?;

        // Store the label
        *state.auth_webview_label.lock().unwrap() = Some(label.clone());

        // Start polling for completion
        let app_handle = app.clone();
        let state_clone = state.inner().clone();
        tauri::async_runtime::spawn(async move {
            poll_for_auth_completion(app_handle, state_clone, label).await;
        });

        Ok(())
    }

    async fn poll_for_auth_completion(app: tauri::AppHandle, state: AuthState, label: String) {
        const LANDING_URL: &str = "https://www.cbc.ca/account/landing";
        const MAX_ATTEMPTS: u32 = 600; // 5 minutes at 500ms intervals

        for _ in 0..MAX_ATTEMPTS {
            tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

            // Check if window still exists
            let Some(window) = app.get_webview_window(&label) else {
                // Window was closed by user
                let _ = app.emit("cbc-auth-cancelled", ());
                *state.auth_webview_label.lock().unwrap() = None;
                return;
            };

            // Get current URL
            if let Ok(url) = window.url() {
                let url_str = url.to_string();

                if url_str.starts_with(LANDING_URL) {
                    // User has logged in, extract cookies
                    if let Ok(cookies) = window.cookies_for_url(url) {
                        let cookie_map: HashMap<String, String> = cookies
                            .into_iter()
                            .filter_map(|c| {
                                let name = c.name().to_string();
                                let value = c.value().to_string();
                                if !name.is_empty() && !value.is_empty() {
                                    Some((name, value))
                                } else {
                                    None
                                }
                            })
                            .collect();

                        if !cookie_map.is_empty() {
                            // Create session
                            let session = AuthSession {
                                cookies: cookie_map,
                                user_id: None, // Could extract from cookies if available
                                expires_at: std::time::SystemTime::now()
                                    .duration_since(std::time::UNIX_EPOCH)
                                    .unwrap()
                                    .as_secs() as i64
                                    + 86400, // 24 hours
                            };

                            // Store session
                            *state.session.lock().unwrap() = Some(session.clone());

                            // Close window
                            let _ = window.close();
                            *state.auth_webview_label.lock().unwrap() = None;

                            // Emit success event
                            let _ = app.emit("cbc-auth-success", session);
                            return;
                        }
                    }

                    // Failed to extract cookies
                    let _ = window.close();
                    *state.auth_webview_label.lock().unwrap() = None;
                    let _ = app.emit("cbc-auth-error", "Failed to extract session cookies");
                    return;
                }
            }
        }

        // Timeout - close window
        if let Some(window) = app.get_webview_window(&label) {
            let _ = window.close();
        }
        *state.auth_webview_label.lock().unwrap() = None;
        let _ = app.emit("cbc-auth-timeout", ());
    }

    #[tauri::command]
    pub async fn cancel_cbc_auth(
        app: tauri::AppHandle,
        state: State<'_, AuthState>,
    ) -> Result<(), String> {
        if let Some(label) = state.auth_webview_label.lock().unwrap().take() {
            if let Some(window) = app.get_webview_window(&label) {
                let _ = window.close();
            }
        }
        Ok(())
    }

    #[derive(Debug, Deserialize)]
    struct CatalogResponse {
        lineups: Lineups,
    }

    #[derive(Debug, Deserialize)]
    struct Lineups {
        results: Vec<Lineup>,
    }

    #[derive(Debug, Deserialize)]
    struct Lineup {
        title: String,
        #[serde(default)]
        items: Vec<LineupItem>,
    }

    #[derive(Debug, Deserialize)]
    struct LineupItem {
        title: String,
        #[serde(default)]
        key: String,
        #[serde(default)]
        description: String,
        url: String,
        #[serde(default)]
        images: Option<Images>,
        #[serde(default)]
        air_date: Option<String>,
        #[serde(rename = "airDate", default)]
        air_date_alt: Option<String>,
        #[serde(rename = "type")]
        item_type: String,
        #[serde(default)]
        tier: String,
        #[serde(rename = "isVodEnabled", default)]
        is_vod_enabled: bool,
        #[serde(rename = "idMedia", default)]
        id_media: Option<i64>,
    }

    #[derive(Debug, Deserialize)]
    struct Images {
        #[serde(default)]
        card: Option<Image>,
        #[serde(default)]
        background: Option<Image>,
    }

    #[derive(Debug, Deserialize)]
    struct Image {
        url: String,
    }

    #[tauri::command]
    pub async fn fetch_olympic_streams(
        _cookies: std::collections::HashMap<String, String>,
    ) -> Result<Vec<StreamInfo>, String> {
        const CATALOG_URL: &str =
            "https://services.radio-canada.ca/ott/catalog/v2/gem/section/olympics";

        let client = reqwest::Client::new();
        let mut all_streams = Vec::new();
        let mut seen_ids: HashSet<String> = HashSet::new();
        let mut page_number = 1;
        let page_size = 6;

        loop {
            let url = format!(
                "{}?device=web&pageSize={}&pageNumber={}",
                CATALOG_URL, page_size, page_number
            );

            let response = client
                .get(&url)
                .header("Accept", "application/json")
                .send()
                .await
                .map_err(|e| format!("Failed to fetch catalog: {}", e))?;

            if !response.status().is_success() {
                return Err(format!(
                    "Catalog API returned status: {}",
                    response.status()
                ));
            }

            let catalog: CatalogResponse = response
                .json()
                .await
                .map_err(|e| format!("Failed to parse catalog response: {}", e))?;

            let page_streams = convert_lineups_to_streams(&catalog.lineups.results, &mut seen_ids);
            all_streams.extend(page_streams);

            // Check if we've reached the last page
            if catalog.lineups.results.len() < page_size {
                break;
            }

            page_number += 1;

            // Safety limit - don't fetch more than 10 pages
            if page_number > 10 {
                break;
            }
        }

        Ok(all_streams)
    }

    fn convert_lineups_to_streams(
        lineups: &[Lineup],
        seen_ids: &mut HashSet<String>,
    ) -> Vec<StreamInfo> {
        let mut streams = Vec::new();

        for lineup in lineups {
            for item in &lineup.items {
                // Only include Live and Media types
                if item.item_type != "Live" && item.item_type != "Media" {
                    continue;
                }

                let stream_id = item
                    .id_media
                    .map(|id| id.to_string())
                    .unwrap_or_else(|| item.key.clone());

                // Check for duplicates across all pages
                if seen_ids.contains(&stream_id) {
                    continue;
                }
                seen_ids.insert(stream_id.clone());

                let thumbnail_url = item
                    .images
                    .as_ref()
                    .and_then(|img| img.card.as_ref().map(|c| c.url.clone()))
                    .or_else(|| {
                        item.images
                            .as_ref()
                            .and_then(|img| img.background.as_ref().map(|b| b.url.clone()))
                    })
                    .unwrap_or_default();

                let air_date = item
                    .air_date
                    .clone()
                    .or(item.air_date_alt.clone())
                    .unwrap_or_default();

                let is_past = DateTime::parse_from_rfc3339(&air_date)
                    .map(|dt| dt.with_timezone(&Utc) < Utc::now())
                    .unwrap_or(false);

                let status = if !item.is_vod_enabled && is_past {
                    "live"
                } else if item.is_vod_enabled {
                    "replay"
                } else {
                    "upcoming"
                };

                let stream = StreamInfo {
                    id: stream_id,
                    title: item.title.clone(),
                    description: item.description.clone(),
                    sport: lineup.title.clone(),
                    status: status.to_string(),
                    start_time: air_date,
                    end_time: None,
                    thumbnail_url,
                    stream_url: item.url.clone(),
                    requires_auth: item.tier == "Member" || item.tier == "Premium",
                    is_premium: item.tier == "Premium",
                };

                streams.push(stream);
            }
        }

        streams
    }

    #[derive(Debug, Serialize, Deserialize)]
    pub struct BitrateInfo {
        pub bitrate: u32,
        pub width: u32,
        pub height: u32,
        pub lines: String,
    }

    #[derive(Debug, Serialize, Deserialize)]
    pub struct StreamManifest {
        pub url: String,
        pub error_code: i32,
        pub message: Option<String>,
        pub bitrates: Vec<BitrateInfo>,
    }

    #[derive(Debug, Deserialize)]
    struct ValidationResponse {
        url: String,
        message: Option<String>,
        #[serde(rename = "errorCode")]
        error_code: i32,
        #[serde(default)]
        bitrates: Vec<ValidationBitrate>,
    }

    #[derive(Debug, Deserialize)]
    struct ValidationBitrate {
        bitrate: u32,
        width: u32,
        height: u32,
        lines: String,
    }

    #[tauri::command]
    pub async fn get_stream_manifest(
        stream_url: String,
        state: State<'_, AuthState>,
    ) -> Result<StreamManifest, String> {
        println!(
            "[get_stream_manifest] Called with stream_url: {}",
            stream_url
        );

        // Extract idMedia from the stream_url
        // The URL ends with something like "...-30093" where 30093 is the idMedia
        let id_media = stream_url
            .split('-')
            .last()
            .and_then(|s| s.parse::<i64>().ok())
            .ok_or("Invalid stream URL format")?;

        println!("[get_stream_manifest] Extracted idMedia: {}", id_media);

        // Check if user is authenticated and extract cookies
        // Clone cookies here to release the mutex lock before any await points
        let cookies = {
            let session = state.session.lock().unwrap();
            let has_session = session.is_some();
            println!("[get_stream_manifest] Session exists: {}", has_session);
            if has_session {
                println!(
                    "[get_stream_manifest] Cookie count: {}",
                    session.as_ref().unwrap().cookies.len()
                );
                for (key, _value) in session.as_ref().unwrap().cookies.iter() {
                    println!("[get_stream_manifest] Cookie key: {}", key);
                }
            }
            session.as_ref().map(|s| s.cookies.clone())
        };

        let session_cookies = cookies.ok_or("Not authenticated")?;
        println!("[get_stream_manifest] Successfully extracted session cookies");

        // Build the validation URL
        const VALIDATION_BASE_URL: &str = "https://services.radio-canada.ca/media/validation/v2/";
        let validation_url = format!(
            "{}?appCode=medianetlive&connectionType=hd&deviceType=ipad&idMedia={}&multibitrate=true&output=json&tech=hls&manifestVersion=2&manifestType=desktop",
            VALIDATION_BASE_URL, id_media
        );
        println!("[get_stream_manifest] Validation URL: {}", validation_url);

        // Create client and add authentication cookies
        let client = reqwest::Client::new();
        let cookie_header: String = session_cookies
            .iter()
            .map(|(k, v)| format!("{}={}", k, v))
            .collect::<Vec<_>>()
            .join("; ");

        println!(
            "[get_stream_manifest] Cookie header length: {} chars",
            cookie_header.len()
        );
        println!(
            "[get_stream_manifest] Cookie header preview: {}...",
            cookie_header.chars().take(100).collect::<String>()
        );

        // Make the request
        println!("[get_stream_manifest] Sending request...");
        let response = client
            .get(&validation_url)
            .header("Accept", "application/json")
            .header("Cookie", cookie_header)
            .send()
            .await
            .map_err(|e| {
                println!("[get_stream_manifest] Request failed: {}", e);
                format!("Failed to fetch stream manifest: {}", e)
            })?;

        println!(
            "[get_stream_manifest] Response status: {}",
            response.status()
        );

        // Handle authentication errors
        if response.status() == 401 {
            println!("[get_stream_manifest] Got 401 - session expired");
            return Err("Session expired - please login again".to_string());
        }

        if !response.status().is_success() {
            let status = response.status();
            println!("[get_stream_manifest] Non-success status: {}", status);
            return Err(format!("Manifest API returned status: {}", status));
        }

        // Parse the response
        let response_text = response.text().await.map_err(|e| {
            println!("[get_stream_manifest] Failed to get response text: {}", e);
            format!("Failed to get response text: {}", e)
        })?;

        println!("[get_stream_manifest] Response body: {}", response_text);

        let validation: ValidationResponse = serde_json::from_str(&response_text).map_err(|e| {
            println!("[get_stream_manifest] Failed to parse JSON: {}", e);
            format!("Failed to parse manifest response: {}", e)
        })?;

        // Check for API-level errors
        if validation.error_code != 0 {
            println!(
                "[get_stream_manifest] API error code: {}",
                validation.error_code
            );
            return Err(format!(
                "API error {}: {}",
                validation.error_code,
                validation
                    .message
                    .unwrap_or_else(|| "Unknown error".to_string())
            ));
        }

        println!("[get_stream_manifest] Success! Got manifest URL");

        // Convert to our public struct
        let bitrates: Vec<BitrateInfo> = validation
            .bitrates
            .into_iter()
            .map(|b| BitrateInfo {
                bitrate: b.bitrate,
                width: b.width,
                height: b.height,
                lines: b.lines,
            })
            .collect();

        Ok(StreamManifest {
            url: validation.url,
            error_code: validation.error_code,
            message: validation.message,
            bitrates,
        })
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use std::collections::HashSet;

        fn create_test_lineup_item(
            title: &str,
            item_type: &str,
            tier: &str,
            id_media: Option<i64>,
            key: &str,
        ) -> LineupItem {
            LineupItem {
                title: title.to_string(),
                key: key.to_string(),
                description: "Test description".to_string(),
                url: format!("https://cbc.ca/stream/{}", key),
                images: Some(Images {
                    card: Some(Image {
                        url: "https://cbc.ca/image/card.jpg".to_string(),
                    }),
                    background: Some(Image {
                        url: "https://cbc.ca/image/bg.jpg".to_string(),
                    }),
                }),
                air_date: Some("2024-07-26T14:00:00Z".to_string()),
                air_date_alt: None,
                item_type: item_type.to_string(),
                tier: tier.to_string(),
                is_vod_enabled: false,
                id_media,
            }
        }

        mod serialization_tests {
            use super::*;

            #[test]
            fn test_stream_manifest_serialization() {
                let manifest = StreamManifest {
                    url: "https://cbc.ca/stream.m3u8".to_string(),
                    error_code: 0,
                    message: None,
                    bitrates: vec![BitrateInfo {
                        bitrate: 5000000,
                        width: 1920,
                        height: 1080,
                        lines: "1080p".to_string(),
                    }],
                };

                let json = serde_json::to_string(&manifest).unwrap();
                let deserialized: StreamManifest = serde_json::from_str(&json).unwrap();

                assert_eq!(deserialized.url, "https://cbc.ca/stream.m3u8");
                assert_eq!(deserialized.error_code, 0);
                assert_eq!(deserialized.bitrates.len(), 1);
                assert_eq!(deserialized.bitrates[0].bitrate, 5000000);
            }

            #[test]
            fn test_catalog_response_deserialization() {
                let json = r#"
                {
                    "lineups": {
                        "results": [
                            {
                                "title": "Hockey",
                                "items": [
                                    {
                                        "title": "Game 1",
                                        "key": "game1",
                                        "url": "https://cbc.ca/game1",
                                        "type": "Live",
                                        "tier": "Free",
                                        "isVodEnabled": false,
                                        "idMedia": 123
                                    }
                                ]
                            }
                        ]
                    }
                }
                "#;

                let catalog: CatalogResponse = serde_json::from_str(json).unwrap();
                assert_eq!(catalog.lineups.results.len(), 1);
                assert_eq!(catalog.lineups.results[0].title, "Hockey");
                assert_eq!(catalog.lineups.results[0].items.len(), 1);
                assert_eq!(catalog.lineups.results[0].items[0].title, "Game 1");
            }

            #[test]
            fn test_lineup_item_deserialization_with_defaults() {
                let json = r#"
                {
                    "title": "Minimal Item",
                    "url": "https://cbc.ca/minimal",
                    "type": "Live"
                }
                "#;

                let item: LineupItem = serde_json::from_str(json).unwrap();
                assert_eq!(item.title, "Minimal Item");
                assert_eq!(item.key, "");
                assert_eq!(item.description, "");
                assert_eq!(item.tier, "");
                assert!(!item.is_vod_enabled);
                assert!(item.id_media.is_none());
                assert!(item.air_date.is_none());
                assert!(item.air_date_alt.is_none());
            }

            #[test]
            fn test_images_deserialization() {
                let json = r#"
                {
                    "card": {
                        "url": "https://cbc.ca/card.jpg"
                    },
                    "background": {
                        "url": "https://cbc.ca/bg.jpg"
                    }
                }
                "#;

                let images: Images = serde_json::from_str(json).unwrap();
                assert_eq!(images.card.unwrap().url, "https://cbc.ca/card.jpg");
                assert_eq!(images.background.unwrap().url, "https://cbc.ca/bg.jpg");
            }

            #[test]
            fn test_images_with_null_fields() {
                let json = r#"
                {
                    "card": null,
                    "background": {
                        "url": "https://cbc.ca/bg.jpg"
                    }
                }
                "#;

                let images: Images = serde_json::from_str(json).unwrap();
                assert!(images.card.is_none());
                assert!(images.background.is_some());
            }

            #[test]
            fn test_validation_response_deserialization() {
                let json = r#"
                {
                    "url": "https://cbc.ca/stream.m3u8",
                    "errorCode": 0,
                    "message": null,
                    "bitrates": [
                        {
                            "bitrate": 5000000,
                            "width": 1920,
                            "height": 1080,
                            "lines": "1080p"
                        }
                    ]
                }
                "#;

                let validation: ValidationResponse = serde_json::from_str(json).unwrap();
                assert_eq!(validation.url, "https://cbc.ca/stream.m3u8");
                assert_eq!(validation.error_code, 0);
                assert!(validation.message.is_none());
                assert_eq!(validation.bitrates.len(), 1);
                assert_eq!(validation.bitrates[0].bitrate, 5000000);
            }

            #[test]
            fn test_validation_response_with_error() {
                let json = r#"
                {
                    "url": "",
                    "errorCode": 403,
                    "message": "Access denied",
                    "bitrates": []
                }
                "#;

                let validation: ValidationResponse = serde_json::from_str(json).unwrap();
                assert_eq!(validation.url, "");
                assert_eq!(validation.error_code, 403);
                assert_eq!(validation.message, Some("Access denied".to_string()));
            }

            #[test]
            fn test_air_date_alt_alias() {
                let json = r#"
                {
                    "title": "Game",
                    "url": "https://cbc.ca/game",
                    "type": "Live",
                    "airDate": "2024-07-26T14:00:00Z"
                }
                "#;

                let item: LineupItem = serde_json::from_str(json).unwrap();
                assert!(item.air_date.is_none());
                assert_eq!(item.air_date_alt, Some("2024-07-26T14:00:00Z".to_string()));
            }

            #[test]
            fn test_is_vod_enabled_alias() {
                let json = r#"
                {
                    "title": "Game",
                    "url": "https://cbc.ca/game",
                    "type": "Live",
                    "isVodEnabled": true
                }
                "#;

                let item: LineupItem = serde_json::from_str(json).unwrap();
                assert!(item.is_vod_enabled);
            }

            #[test]
            fn test_id_media_alias() {
                let json = r#"
                {
                    "title": "Game",
                    "url": "https://cbc.ca/game",
                    "type": "Live",
                    "idMedia": 12345
                }
                "#;

                let item: LineupItem = serde_json::from_str(json).unwrap();
                assert_eq!(item.id_media, Some(12345));
            }

            #[test]
            fn test_bitrate_info_roundtrip() {
                let bitrate = BitrateInfo {
                    bitrate: 8000000,
                    width: 3840,
                    height: 2160,
                    lines: "4K".to_string(),
                };

                let json = serde_json::to_string(&bitrate).unwrap();
                let deserialized: BitrateInfo = serde_json::from_str(&json).unwrap();

                assert_eq!(deserialized.bitrate, 8000000);
                assert_eq!(deserialized.width, 3840);
                assert_eq!(deserialized.height, 2160);
                assert_eq!(deserialized.lines, "4K");
            }

            #[test]
            fn test_stream_manifest_with_multiple_bitrates() {
                let manifest = StreamManifest {
                    url: "https://cbc.ca/stream.m3u8".to_string(),
                    error_code: 0,
                    message: Some("Success".to_string()),
                    bitrates: vec![
                        BitrateInfo {
                            bitrate: 2000000,
                            width: 1280,
                            height: 720,
                            lines: "720p".to_string(),
                        },
                        BitrateInfo {
                            bitrate: 5000000,
                            width: 1920,
                            height: 1080,
                            lines: "1080p".to_string(),
                        },
                    ],
                };

                let json = serde_json::to_string(&manifest).unwrap();
                let deserialized: StreamManifest = serde_json::from_str(&json).unwrap();

                assert_eq!(deserialized.bitrates.len(), 2);
                assert_eq!(deserialized.bitrates[0].lines, "720p");
                assert_eq!(deserialized.bitrates[1].lines, "1080p");
            }

            #[test]
            fn test_empty_lineups_deserialization() {
                let json = r#"
                {
                    "lineups": {
                        "results": []
                    }
                }
                "#;

                let catalog: CatalogResponse = serde_json::from_str(json).unwrap();
                assert!(catalog.lineups.results.is_empty());
            }
        }

        mod data_transformation_tests {
            use super::*;
            use super::create_test_lineup_item;

            #[test]
            fn test_convert_lineups_to_streams_filters_by_type() {
                let lineup = Lineup {
                    title: "Hockey".to_string(),
                    items: vec![
                        create_test_lineup_item("Live Game", "Live", "Free", Some(123), "hockey-live"),
                        create_test_lineup_item("Media Clip", "Media", "Free", Some(124), "hockey-media"),
                        create_test_lineup_item("Article", "Article", "Free", Some(125), "hockey-article"),
                    ],
                };

                let mut seen_ids = HashSet::new();
                let streams = convert_lineups_to_streams(&[lineup], &mut seen_ids);

                assert_eq!(streams.len(), 2);
                assert!(streams.iter().any(|s| s.title == "Live Game"));
                assert!(streams.iter().any(|s| s.title == "Media Clip"));
                assert!(!streams.iter().any(|s| s.title == "Article"));
            }

            #[test]
            fn test_convert_lineups_to_streams_deduplicates() {
                let lineup = Lineup {
                    title: "Hockey".to_string(),
                    items: vec![
                        create_test_lineup_item("Game 1", "Live", "Free", Some(123), "game1"),
                        create_test_lineup_item("Game 1 Duplicate", "Live", "Free", Some(123), "game1-dup"),
                    ],
                };

                let mut seen_ids = HashSet::new();
                let streams = convert_lineups_to_streams(&[lineup], &mut seen_ids);

                assert_eq!(streams.len(), 1);
                assert_eq!(streams[0].title, "Game 1");
            }

            #[test]
            fn test_convert_lineups_to_streams_uses_id_media_as_key() {
                let lineup = Lineup {
                    title: "Hockey".to_string(),
                    items: vec![create_test_lineup_item(
                        "Game",
                        "Live",
                        "Free",
                        Some(12345),
                        "fallback-key",
                    )],
                };

                let mut seen_ids = HashSet::new();
                let streams = convert_lineups_to_streams(&[lineup], &mut seen_ids);

                assert_eq!(streams.len(), 1);
                assert_eq!(streams[0].id, "12345");
            }

            #[test]
            fn test_convert_lineups_to_streams_fallbacks_to_key() {
                let lineup = Lineup {
                    title: "Hockey".to_string(),
                    items: vec![LineupItem {
                        title: "Game".to_string(),
                        key: "fallback-key".to_string(),
                        description: "Test".to_string(),
                        url: "https://cbc.ca/stream".to_string(),
                        images: None,
                        air_date: Some("2024-07-26T14:00:00Z".to_string()),
                        air_date_alt: None,
                        item_type: "Live".to_string(),
                        tier: "Free".to_string(),
                        is_vod_enabled: false,
                        id_media: None,
                    }],
                };

                let mut seen_ids = HashSet::new();
                let streams = convert_lineups_to_streams(&[lineup], &mut seen_ids);

                assert_eq!(streams.len(), 1);
                assert_eq!(streams[0].id, "fallback-key");
            }

            #[test]
            fn test_convert_lineups_to_streams_sets_premium_flag() {
                let lineup = Lineup {
                    title: "Hockey".to_string(),
                    items: vec![
                        create_test_lineup_item("Free Game", "Live", "Free", Some(1), "free"),
                        create_test_lineup_item("Member Game", "Live", "Member", Some(2), "member"),
                        create_test_lineup_item("Premium Game", "Live", "Premium", Some(3), "premium"),
                    ],
                };

                let mut seen_ids = HashSet::new();
                let streams = convert_lineups_to_streams(&[lineup], &mut seen_ids);

                let free_stream = streams.iter().find(|s| s.id == "1").unwrap();
                let member_stream = streams.iter().find(|s| s.id == "2").unwrap();
                let premium_stream = streams.iter().find(|s| s.id == "3").unwrap();

                assert!(!free_stream.requires_auth);
                assert!(!free_stream.is_premium);

                assert!(member_stream.requires_auth);
                assert!(!member_stream.is_premium);

                assert!(premium_stream.requires_auth);
                assert!(premium_stream.is_premium);
            }

            #[test]
            fn test_convert_lineups_to_streams_extracts_thumbnail() {
                let lineup = Lineup {
                    title: "Hockey".to_string(),
                    items: vec![LineupItem {
                        title: "Game".to_string(),
                        key: "game".to_string(),
                        description: "Test".to_string(),
                        url: "https://cbc.ca/stream".to_string(),
                        images: Some(Images {
                            card: Some(Image {
                                url: "https://cbc.ca/card.jpg".to_string(),
                            }),
                            background: Some(Image {
                                url: "https://cbc.ca/bg.jpg".to_string(),
                            }),
                        }),
                        air_date: Some("2024-07-26T14:00:00Z".to_string()),
                        air_date_alt: None,
                        item_type: "Live".to_string(),
                        tier: "Free".to_string(),
                        is_vod_enabled: false,
                        id_media: Some(1),
                    }],
                };

                let mut seen_ids = HashSet::new();
                let streams = convert_lineups_to_streams(&[lineup], &mut seen_ids);

                assert_eq!(streams[0].thumbnail_url, "https://cbc.ca/card.jpg");
            }

            #[test]
            fn test_convert_lineups_to_streams_fallbacks_to_background_thumbnail() {
                let lineup = Lineup {
                    title: "Hockey".to_string(),
                    items: vec![LineupItem {
                        title: "Game".to_string(),
                        key: "game".to_string(),
                        description: "Test".to_string(),
                        url: "https://cbc.ca/stream".to_string(),
                        images: Some(Images {
                            card: None,
                            background: Some(Image {
                                url: "https://cbc.ca/bg.jpg".to_string(),
                            }),
                        }),
                        air_date: Some("2024-07-26T14:00:00Z".to_string()),
                        air_date_alt: None,
                        item_type: "Live".to_string(),
                        tier: "Free".to_string(),
                        is_vod_enabled: false,
                        id_media: Some(1),
                    }],
                };

                let mut seen_ids = HashSet::new();
                let streams = convert_lineups_to_streams(&[lineup], &mut seen_ids);

                assert_eq!(streams[0].thumbnail_url, "https://cbc.ca/bg.jpg");
            }

            #[test]
            fn test_convert_lineups_to_streams_default_thumbnail() {
                let lineup = Lineup {
                    title: "Hockey".to_string(),
                    items: vec![LineupItem {
                        title: "Game".to_string(),
                        key: "game".to_string(),
                        description: "Test".to_string(),
                        url: "https://cbc.ca/stream".to_string(),
                        images: None,
                        air_date: Some("2024-07-26T14:00:00Z".to_string()),
                        air_date_alt: None,
                        item_type: "Live".to_string(),
                        tier: "Free".to_string(),
                        is_vod_enabled: false,
                        id_media: Some(1),
                    }],
                };

                let mut seen_ids = HashSet::new();
                let streams = convert_lineups_to_streams(&[lineup], &mut seen_ids);

                assert_eq!(streams[0].thumbnail_url, "");
            }

            #[test]
            fn test_convert_lineups_to_streams_uses_air_date_alt() {
                let lineup = Lineup {
                    title: "Hockey".to_string(),
                    items: vec![LineupItem {
                        title: "Game".to_string(),
                        key: "game".to_string(),
                        description: "Test".to_string(),
                        url: "https://cbc.ca/stream".to_string(),
                        images: None,
                        air_date: None,
                        air_date_alt: Some("2024-07-26T16:00:00Z".to_string()),
                        item_type: "Live".to_string(),
                        tier: "Free".to_string(),
                        is_vod_enabled: false,
                        id_media: Some(1),
                    }],
                };

                let mut seen_ids = HashSet::new();
                let streams = convert_lineups_to_streams(&[lineup], &mut seen_ids);

                assert_eq!(streams[0].start_time, "2024-07-26T16:00:00Z");
            }

            #[test]
            fn test_convert_lineups_to_streams_sets_sport() {
                let lineup = Lineup {
                    title: "Figure Skating".to_string(),
                    items: vec![create_test_lineup_item(
                        "Event",
                        "Live",
                        "Free",
                        Some(1),
                        "event",
                    )],
                };

                let mut seen_ids = HashSet::new();
                let streams = convert_lineups_to_streams(&[lineup], &mut seen_ids);

                assert_eq!(streams[0].sport, "Figure Skating");
            }

            #[test]
            fn test_convert_lineups_to_streams_preserves_stream_url() {
                let lineup = Lineup {
                    title: "Hockey".to_string(),
                    items: vec![LineupItem {
                        title: "Game".to_string(),
                        key: "game123".to_string(),
                        description: "Test".to_string(),
                        url: "https://gem.cbc.ca/media/sports/hockey/game123".to_string(),
                        images: None,
                        air_date: Some("2024-07-26T14:00:00Z".to_string()),
                        air_date_alt: None,
                        item_type: "Live".to_string(),
                        tier: "Free".to_string(),
                        is_vod_enabled: false,
                        id_media: Some(1),
                    }],
                };

                let mut seen_ids = HashSet::new();
                let streams = convert_lineups_to_streams(&[lineup], &mut seen_ids);

                assert_eq!(
                    streams[0].stream_url,
                    "https://gem.cbc.ca/media/sports/hockey/game123"
                );
            }

            #[test]
            fn test_convert_lineups_to_streams_handles_multiple_lineups() {
                let lineups = vec![
                    Lineup {
                        title: "Hockey".to_string(),
                        items: vec![create_test_lineup_item(
                            "Hockey Game",
                            "Live",
                            "Free",
                            Some(1),
                            "hockey",
                        )],
                    },
                    Lineup {
                        title: "Figure Skating".to_string(),
                        items: vec![create_test_lineup_item(
                            "Skating Event",
                            "Live",
                            "Free",
                            Some(2),
                            "skating",
                        )],
                    },
                ];

                let mut seen_ids = HashSet::new();
                let streams = convert_lineups_to_streams(&lineups, &mut seen_ids);

                assert_eq!(streams.len(), 2);
                assert!(streams.iter().any(|s| s.sport == "Hockey"));
                assert!(streams.iter().any(|s| s.sport == "Figure Skating"));
            }

            #[test]
            fn test_convert_lineups_to_streams_empty_lineups() {
                let lineups: Vec<Lineup> = vec![];
                let mut seen_ids = HashSet::new();
                let streams = convert_lineups_to_streams(&lineups, &mut seen_ids);

                assert!(streams.is_empty());
            }

            #[test]
            fn test_convert_lineups_to_streams_lineup_with_no_items() {
                let lineup = Lineup {
                    title: "Empty Sport".to_string(),
                    items: vec![],
                };

                let mut seen_ids = HashSet::new();
                let streams = convert_lineups_to_streams(&[lineup], &mut seen_ids);

                assert!(streams.is_empty());
            }

            #[test]
            fn test_convert_lineups_to_streams_all_items_filtered() {
                let lineup = Lineup {
                    title: "Hockey".to_string(),
                    items: vec![
                        create_test_lineup_item("Article 1", "Article", "Free", Some(1), "art1"),
                        create_test_lineup_item("Article 2", "Article", "Free", Some(2), "art2"),
                    ],
                };

                let mut seen_ids = HashSet::new();
                let streams = convert_lineups_to_streams(&[lineup], &mut seen_ids);

                assert!(streams.is_empty());
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_oauth::init())
        .manage(AuthState::new())
        .invoke_handler(tauri::generate_handler![
            commands::check_auth_status,
            commands::set_auth_session,
            commands::logout,
            commands::start_cbc_auth,
            commands::cancel_cbc_auth,
            commands::fetch_olympic_streams,
            commands::get_stream_manifest
        ]);

    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_updater::Builder::new().build());

    builder
        .setup(|app| {
            #[cfg(desktop)]
            {
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(e) = update(handle).await {
                        eprintln!("Update check failed: {}", e);
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


#[cfg(desktop)]
async fn update(app: tauri::AppHandle) -> tauri_plugin_updater::Result<()> {
    use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};

    let Some(update) = app.updater()?.check().await? else {
        return Ok(());
    };

    let version = &update.version;
    let body = update.body.as_deref().unwrap_or("No release notes available");
    let message = format!(
        "A new version ({version}) is available!\n\nRelease notes:\n{body}\n\nWould you like to update now?"
    );

    let should_update = app
        .dialog()
        .message(&message)
        .title("Update Available")
        .kind(MessageDialogKind::Info)
        .buttons(MessageDialogButtons::YesNo)
        .blocking_show();

    if !should_update {
        return Ok(());
    }

    let progress_app = app.clone();

    let progress_dialog = progress_app
        .dialog()
        .message("Preparing to download update...")
        .title("Downloading Update")
        .kind(MessageDialogKind::Info)
        .buttons(MessageDialogButtons::OkCancel)
        .blocking_show();

    if !progress_dialog {
        println!("User cancelled update download");
        return Ok(());
    }

    let progress_app = app.clone();
    let mut last_percentage = 0u8;

    update
        .download_and_install(
            move |chunk_length, content_length| {
                let downloaded = chunk_length;
                let total = content_length.unwrap_or(0);

                if total > 0 {
                    let percentage = ((downloaded as f64 / total as f64) * 100.0) as u8;

                    if percentage > last_percentage && percentage % 10 == 0 {
                        println!("Download progress: {}%", percentage);
                        progress_app
                            .dialog()
                            .message(&format!("Downloading update... {}%", percentage))
                            .title("Downloading Update")
                            .kind(MessageDialogKind::Info)
                            .buttons(MessageDialogButtons::OkCancel)
                            .show(|_| {});
                        last_percentage = percentage;
                    }
                }
            },
            || {
                println!("Download finished");
            },
        )
        .await?;

    let should_restart = app
        .dialog()
        .message("Update installed successfully!\n\nWould you like to restart the application now to apply the update?")
        .title("Update Complete")
        .kind(MessageDialogKind::Info)
        .buttons(MessageDialogButtons::YesNo)
        .blocking_show();

    if should_restart {
        app.restart();
    }

    Ok(())
}

#[cfg(test)]
mod auth_state_tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn test_auth_state_new_creates_empty_session() {
        let auth_state = AuthState::new();

        let session = auth_state.session.lock().unwrap();
        assert!(session.is_none());
    }

    #[test]
    fn test_auth_state_session_is_thread_safe() {
        let auth_state = AuthState::new();
        let auth_state_clone = auth_state.clone();

        let handle = std::thread::spawn(move || {
            let mut session = auth_state_clone.session.lock().unwrap();
            *session = Some(AuthSession {
                cookies: HashMap::from([("session_id".to_string(), "abc123".to_string())]),
                user_id: Some("user123".to_string()),
                expires_at: 1234567890,
            });
        });

        handle.join().unwrap();

        let session = auth_state.session.lock().unwrap();
        assert!(session.is_some());
        assert_eq!(
            session.as_ref().unwrap().user_id,
            Some("user123".to_string())
        );
    }

    #[test]
    fn test_auth_state_auth_webview_label_is_thread_safe() {
        let auth_state = AuthState::new();
        let auth_state_clone = auth_state.clone();

        let handle = std::thread::spawn(move || {
            let mut label = auth_state_clone.auth_webview_label.lock().unwrap();
            *label = Some("test_webview".to_string());
        });

        handle.join().unwrap();

        let label = auth_state.auth_webview_label.lock().unwrap();
        assert_eq!(*label, Some("test_webview".to_string()));
    }

    #[test]
    fn test_auth_session_default_values() {
        let session = AuthSession {
            cookies: HashMap::new(),
            user_id: None,
            expires_at: 0,
        };

        assert!(session.cookies.is_empty());
        assert!(session.user_id.is_none());
        assert_eq!(session.expires_at, 0);
    }

    #[test]
    fn test_auth_session_with_values() {
        let cookies = HashMap::from([
            ("session_id".to_string(), "abc123".to_string()),
            ("auth_token".to_string(), "xyz789".to_string()),
        ]);

        let session = AuthSession {
            cookies: cookies.clone(),
            user_id: Some("user123".to_string()),
            expires_at: 1234567890,
        };

        assert_eq!(session.cookies.len(), 2);
        assert_eq!(
            session.cookies.get("session_id"),
            Some(&"abc123".to_string())
        );
        assert_eq!(session.user_id, Some("user123".to_string()));
        assert_eq!(session.expires_at, 1234567890);
    }

    #[test]
    fn test_auth_session_serialization() {
        let session = AuthSession {
            cookies: HashMap::from([("session_id".to_string(), "abc123".to_string())]),
            user_id: Some("user123".to_string()),
            expires_at: 1234567890,
        };

        let json = serde_json::to_string(&session).unwrap();
        let deserialized: AuthSession = serde_json::from_str(&json).unwrap();

        assert_eq!(
            deserialized.cookies.get("session_id"),
            Some(&"abc123".to_string())
        );
        assert_eq!(deserialized.user_id, Some("user123".to_string()));
        assert_eq!(deserialized.expires_at, 1234567890);
    }

    #[test]
    fn test_stream_info_serialization() {
        let stream = StreamInfo {
            id: "123".to_string(),
            title: "Hockey Final".to_string(),
            description: "Gold medal game".to_string(),
            sport: "Hockey".to_string(),
            status: "live".to_string(),
            start_time: "2024-07-26T14:00:00Z".to_string(),
            end_time: None,
            thumbnail_url: "https://cbc.ca/thumb.jpg".to_string(),
            stream_url: "https://gem.cbc.ca/media/123".to_string(),
            requires_auth: true,
            is_premium: false,
        };

        let json = serde_json::to_string(&stream).unwrap();
        let deserialized: StreamInfo = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.id, "123");
        assert_eq!(deserialized.title, "Hockey Final");
        assert_eq!(deserialized.sport, "Hockey");
        assert!(deserialized.requires_auth);
        assert!(!deserialized.is_premium);
    }

    #[test]
    fn test_stream_info_optional_end_time() {
        let stream_with_end = StreamInfo {
            id: "123".to_string(),
            title: "Game".to_string(),
            description: "Description".to_string(),
            sport: "Hockey".to_string(),
            status: "replay".to_string(),
            start_time: "2024-07-26T14:00:00Z".to_string(),
            end_time: Some("2024-07-26T16:00:00Z".to_string()),
            thumbnail_url: "".to_string(),
            stream_url: "".to_string(),
            requires_auth: false,
            is_premium: false,
        };

        let json = serde_json::to_string(&stream_with_end).unwrap();
        let deserialized: StreamInfo = serde_json::from_str(&json).unwrap();

        assert_eq!(
            deserialized.end_time,
            Some("2024-07-26T16:00:00Z".to_string())
        );
    }
}
