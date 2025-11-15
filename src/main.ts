// src/main.ts - IP Subnet Calculator with VLSM Rust backend integration

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

  const existing = document.getElementById("results-table");
  if (existing) existing.remove();

  container.id = "results-table";
  document.body.appendChild(container);

  if (networks > 0) {
    const calcBtnWrapper = document.createElement("div");
    calcBtnWrapper.style.textAlign = "center";
    calcBtnWrapper.style.marginTop = "1rem";

    const calcBtn = document.createElement("button");
    calcBtn.textContent = "Generate";
    calcBtn.id = "calculate-subnets-btn";

    calcBtn.addEventListener("click", async () => {
      // Gather input
      const networkInfos = Array.from(document.querySelectorAll("table tbody tr")).map((row) => {
        const inputs = row.querySelectorAll("input");
        return {
          name: (inputs[0] as HTMLInputElement).value,
          num_hosts: parseInt((inputs[1] as HTMLInputElement).value) || 0,
          contains_default_gateway: (inputs[2] as HTMLInputElement).checked,
        };
      });

      try {
        // Call Rust VLSM calculator
        // Returns array of structs with subnet info
        const result: Array<any> = await invoke("calculate_subnets", {
          ip,
          prefix: mask,
          networks: networkInfos
        });

        // Render result in formatted table
        const outputDivId = 'subnet-results';
        let outputDiv = document.getElementById(outputDivId);
        if (outputDiv) outputDiv.remove();

        outputDiv = document.createElement('div');
        outputDiv.id = outputDivId;
        outputDiv.style.marginTop = '1rem';

        const resultTable = document.createElement('table');
        resultTable.style.width = '100%';
        resultTable.style.borderCollapse = 'collapse';
        resultTable.innerHTML = `
          <thead>
            <tr>
              <th style="border-bottom:1px solid #ccc;padding:4px;">Network Name</th>
              <th style="border-bottom:1px solid #ccc;padding:4px;">Prefix</th>
              <th style="border-bottom:1px solid #ccc;padding:4px;">Decimal Mask</th>
              <th style="border-bottom:1px solid #ccc;padding:4px;">IP Network</th>
              <th style="border-bottom:1px solid #ccc;padding:4px;">Assignable IPs</th>
              <th style="border-bottom:1px solid #ccc;padding:4px;">IP Broadcast</th>
            </tr>
          </thead>
          <tbody></tbody>
        `;

        const tbody = resultTable.querySelector('tbody')!;
        result.forEach((r) => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td style='padding:4px;'>${r.network_name}</td>
            <td style='padding:4px;'>/${r.prefix_mask}</td>
            <td style='padding:4px;'>${r.decimal_mask}</td>
            <td style='padding:4px;'>${r.ip_network}</td>
            <td style='padding:4px;'>${r.assignable_ips}</td>
            <td style='padding:4px;'>${r.ip_broadcast}</td>
          `;
          tbody.appendChild(row);
        });

        outputDiv.appendChild(resultTable);
        document.body.appendChild(outputDiv);

      } catch (e) {
        console.error("Error calling Rust subnet calculator:", e);
      }
    });

    calcBtnWrapper.appendChild(calcBtn);
    container.appendChild(calcBtnWrapper);
  }
});
