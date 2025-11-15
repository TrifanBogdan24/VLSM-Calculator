// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/


struct SubnetInfo {
    name: String,
    num_hosts: u32
}

#[tauri::command]
fn calculate_subnets(ip: String, mask: u8, networks: u32, hosts: Vec<u32>, gateways: Vec<bool>) -> Vec<String> {
    // Example: just return a placeholder for now
    let mut results = Vec::new();
    for i in 0..networks {
        let line = format!(
            "Network {}: {} hosts, gateway included: {}",
            i + 1,
            hosts.get(i as usize).unwrap_or(&0),
            gateways.get(i as usize).unwrap_or(&false)
        );
        results.push(line);
    }
    results
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![calculate_subnets])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
