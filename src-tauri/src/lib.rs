// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/


use serde::{Serialize, Deserialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
struct NetworkInfo {
    name: String,
    num_hosts: u128,
    contains_default_gateway: bool,
}


#[derive(Clone, Debug, Serialize)]
struct ComputedSubnet {
    network_name: String,
    prefix_mask: u32,
    decimal_mask: String,
    ip_network: String,
    assignable_ips: String,
    ip_broadcast: String,
}




fn decimal_ip_into_string(ipv4: [u8; 4]) -> String {
    format!("{}.{}.{}.{}", ipv4[0], ipv4[1], ipv4[2], ipv4[3])
}


fn decimal_ip_into_binar(decimal_ip: &[u8; 4]) -> [bool; 32] {
    let mut binar_ip = [false; 32];

    for (i, &octet) in decimal_ip.iter().enumerate() {
        let mut aux = octet;

        for j in (0..8).rev() {
            let pow: u8 = 2_u8.pow(j); // cast to u8
            if aux >= pow {
                aux -= pow;
                binar_ip[i * 8 + (7 - j) as usize] = true;
            }
        }
    }

    binar_ip
}



fn binar_ip_into_decimal(ip: &[bool; 32]) -> [u8; 4] {
    let mut ipv4: [u8; 4] = [0; 4];

    for (i, chunk) in ip.chunks(8).enumerate() {
        for j in 0..8 {
            if chunk[j] == false {
                continue;
            }
            ipv4[i] = ipv4[i] + 2_u32.pow((7 - j).try_into().unwrap()) as u8;
        }
    }

    ipv4
}

fn mask_into_decimal(prefix_mask: u32) -> [u8; 4]  {
    if prefix_mask > 32 {
        panic!("Invalid mask '{}'", prefix_mask);
    }

    let mut binar_ip: [bool; 32] = [false; 32];
    
    for i in 0..(prefix_mask as usize){
        binar_ip[i] = true;    
    }

    binar_ip_into_decimal(&binar_ip)
}


fn compute_optimal_mask(num_hosts: u128) -> u32 {
    for i in 0..32 {
        // Add +2: IP network and IP broadcast
        if 2_u32.pow(i) as u128 >= num_hosts + 2 {
            return 32 - i;
        }
    }
    return 0;
}


fn get_total_hosts(net: &NetworkInfo) -> u128 {
    net.num_hosts + if net.contains_default_gateway { 0 } else { 1 }
}

fn str_into_decimal_ip(ip: &str) -> [u8; 4] {
    let octets: Vec<u8> = ip
        .split('.')                  // split by '.'
        .map(|s| s.parse::<u8>().expect(&format!("Invalid IP address: '{}'", ip)))
        .collect();

    if octets.len() != 4 {
        panic!("IP must have exactly 8 parts separated by '.'");
    }

    [
        octets[0],
        octets[1],
        octets[2],
        octets[3]
    ]
}

fn increment_ip(ip: &mut [u8; 4]) {
    for i in (0..4).rev() {
        if ip[i] < 255 {
            ip[i] += 1;
            break;
        } else {
            ip[i] = 0;
        }
    }
}

fn decrement_ip(ip: &mut [u8; 4]) {
    for i in (0..4).rev() {
        if ip[i] > 0 {
            ip[i] -= 1;
            break;
        } else {
            ip[i] = 255;
        }
    }
}

pub fn subnet_calculator(ip: &str, prefix: u32, networks: &Vec<NetworkInfo>) -> Vec<ComputedSubnet> {
    let decimal_ip: [u8; 4] = str_into_decimal_ip(ip);
    let binar_ip: [bool; 32] = decimal_ip_into_binar(&decimal_ip);
    let binar_prefix: [bool; 32] = decimal_ip_into_binar(&mask_into_decimal(prefix));
    let mut binar_netw_ip: [bool; 32] = [false; 32];

    for i in 0..32 {
        binar_netw_ip[i] = if binar_prefix[i] { binar_ip[i] } else { false };
    }

    let mut current_network_ip = binar_ip_into_decimal(&binar_netw_ip);

    let mut sorted_networks = networks.clone();
    sorted_networks.sort_by(|a, b| get_total_hosts(b).cmp(&get_total_hosts(a)));

    let mut result: Vec<ComputedSubnet> = Vec::new();

    for netw in sorted_networks.iter() {
        let prefix_mask: u32 = compute_optimal_mask(get_total_hosts(netw));
        let decimal_mask: [u8; 4] = mask_into_decimal(prefix_mask);

        let mut binar_network = decimal_ip_into_binar(&current_network_ip);
        for i in prefix_mask as usize..32 {
            binar_network[i] = true;
        }
        let mut broadcast_ip = binar_ip_into_decimal(&binar_network);

        let mut first_ip = current_network_ip;
        increment_ip(&mut first_ip);
        let mut last_ip = broadcast_ip;
        decrement_ip(&mut last_ip);

        result.push(ComputedSubnet {
            network_name: netw.name.clone(),
            prefix_mask,
            decimal_mask: decimal_ip_into_string(decimal_mask),
            ip_network: decimal_ip_into_string(current_network_ip),
            assignable_ips: format!(
                "{} - {}",
                decimal_ip_into_string(first_ip),
                decimal_ip_into_string(last_ip)
            ),
            ip_broadcast: decimal_ip_into_string(broadcast_ip),
        });


        let mut next_network_ip = broadcast_ip;
        increment_ip(&mut next_network_ip);
        current_network_ip = next_network_ip;
    }

    result
}



#[tauri::command]
fn calculate_subnets(ip: String, prefix: u32, networks: Vec<NetworkInfo>) -> Vec<ComputedSubnet> {
    subnet_calculator(&ip, prefix, &networks)
}



#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![calculate_subnets])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
