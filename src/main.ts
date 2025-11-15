// src/main.ts - UI for IP Subnet Calculator with Rust backend integration

import { invoke } from "@tauri-apps/api/core";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div style="font-family: sans-serif; padding: 2rem;">
    <div style="margin-bottom: 1rem;">
      <label>IP</label>
      <input id="ip" type="text" placeholder="192.168.1.0" />
      <span>/</span>
      <input id="mask" type="text" placeholder="24" />
    </div>

    <div style="margin-bottom: 1rem;">
      <label>Number of networks</label>
      <input id="networks" type="text" placeholder="0" />
      <button id="apply">Apply</button>
    </div>
  </div>
`;

const applyBtn = document.getElementById("apply")!;
applyBtn.addEventListener("click", () => {
  const ip = (document.getElementById("ip") as HTMLInputElement).value;
  const mask = parseInt((document.getElementById("mask") as HTMLInputElement).value);
  const networks = parseInt((document.getElementById("networks") as HTMLInputElement).value);

  console.log("IP:", ip);
  console.log("Mask:", mask);
  console.log("Networks:", networks);

  const container = document.createElement("div");
  container.style.marginTop = "1rem";

  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.innerHTML = `
    <thead>
      <tr>
        <th style="border-bottom: 1px solid #ccc; text-align:left; padding:4px;">Network name</th>
        <th style="border-bottom: 1px solid #ccc; text-align:left; padding:4px;">Number of hosts</th>
        <th style="border-bottom: 1px solid #ccc; text-align:left; padding:4px;">Contains Default Gateway ?</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody")!;
  tbody.innerHTML = "";

  for (let i = 0; i < networks; i++) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td style='padding:4px;'>
        <input type="text" placeholder="Network ${i + 1}" />
      </td>
      <td style='padding:4px;'>
        <input type="number" min="0" value="0" />
      </td>
      <td style='padding:10px; text-align:center;'>
        <input type="checkbox" style="width:20px; height:20px;" />
      </td>
    `;
    tbody.appendChild(row);
  }

  container.appendChild(table);

  // Remove old table if exists
  const existing = document.getElementById("results-table");
  if (existing) existing.remove();

  container.id = "results-table";
  document.body.appendChild(container);

  // Add "Calculate subnets" button if networks > 0
  if (networks > 0) {
    const calcBtnWrapper = document.createElement("div");
    calcBtnWrapper.style.textAlign = "center";
    calcBtnWrapper.style.marginTop = "1rem";

    const calcBtn = document.createElement("button");
    calcBtn.textContent = "Calculate subnets";
    calcBtn.id = "calculate-subnets-btn";

    calcBtn.addEventListener("click", async () => {
      const hosts: number[] = [];
      const gateways: boolean[] = [];

      document.querySelectorAll("table tbody tr").forEach((row) => {
        const inputs = row.querySelectorAll("input");
        hosts.push(parseInt((inputs[1] as HTMLInputElement).value) || 0);
        gateways.push((inputs[2] as HTMLInputElement).checked);
      });

      try {
        const result: string[] = await invoke("calculate_subnets", { ip, mask, networks, hosts, gateways });
        console.log("Subnet results:", result);
        alert(result.join("\n")); // or render in table
      } catch (e) {
        console.error("Error calling Rust command:", e);
      }
    });

    calcBtnWrapper.appendChild(calcBtn);
    container.appendChild(calcBtnWrapper);
  }
});
