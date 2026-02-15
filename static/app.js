function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else n.setAttribute(k, v);
  });
  children.forEach(c => n.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
  return n;
}

function fmtMoney(n) {
  if (n === null || n === undefined) return "—";
  return "£" + Number(n).toLocaleString("en-GB");
}

function renderResult(result) {
  const facts = result.facts || {};
  const val = result.valuation || {};
  const comps = result.comps || [];

  const root = el("div", {}, []);

  root.appendChild(el("div", { class: "grid" }, [
    el("div", { class: "box" }, [
      el("h3", {}, ["Fact Card"]),
      el("p", {}, [`Asking: ${fmtMoney(facts.price)}`]),
      el("p", {}, [`Beds/Baths: ${facts.bedrooms ?? "—"}/${facts.bathrooms ?? "—"}`]),
      el("p", {}, [`Tenure: ${facts.tenure ?? "—"}`]),
      el("p", {}, [`Size: ${facts.floor_area_sqm ? facts.floor_area_sqm.toFixed(2) + " sqm" : "—"}`]),
      el("p", {}, [`EPC: ${facts.epc_rating ?? "—"}`]),
    ]),
    el("div", { class: "box" }, [
      el("h3", {}, ["Verdict"]),
      el("p", {}, [`Fair (low/mid/high): ${val.fair_value_range ?? "—"}`]),
      el("p", {}, [`Asking vs mid: ${val.asking_vs_mid ?? "—"}`]),
      el("p", {}, [`Score: ${val.score ?? "—"} / 100`]),
      el("p", {}, [`Label: ${val.label ?? "—"}`]),
      el("p", {}, [`Offer: ${val.offer_anchor ?? "—"} (${val.offer_band ?? "—"})`]),
    ])
  ]));

  root.appendChild(el("div", { class: "box" }, [
    el("h3", {}, ["Sold comps (PPD)"]),
    comps.length
      ? (() => {
          const table = el("table", {}, []);
          table.appendChild(el("thead", {}, [
            el("tr", {}, [
              el("th", {}, ["Date"]),
              el("th", {}, ["Price"]),
              el("th", {}, ["Postcode"]),
              el("th", {}, ["Type"]),
              el("th", {}, ["Street/Town"]),
            ])
          ]));
          const tbody = el("tbody", {}, []);
          comps.forEach(c => {
            tbody.appendChild(el("tr", {}, [
              el("td", {}, [c.date || "—"]),
              el("td", {}, [fmtMoney(c.price)]),
              el("td", {}, [c.postcode || "—"]),
              el("td", {}, [c.property_type || "—"]),
              el("td", {}, [((c.street || "") + " " + (c.town || "")).trim() || "—"]),
            ]));
          });
          table.appendChild(tbody);
          return table;
        })()
      : el("p", { class: "muted" }, ["No comps found. (Import PPD to SQLite to enable sold comps.)"]),
  ]));

  if (val.notes && val.notes.length) {
    const ul = el("ul", {}, []);
    val.notes.forEach(n => ul.appendChild(el("li", {}, [n])));
    root.appendChild(el("div", { class: "box" }, [
      el("h3", {}, ["Notes"]),
      ul
    ]));
  }

  return root;
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("analyzeForm");
  const input = document.getElementById("urlInput");
  const resultCard = document.getElementById("resultCard");
  const resultDiv = document.getElementById("result");
  const resultLinks = document.getElementById("resultLinks");

  console.log("PropertyEdge JavaScript loaded");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = input.value.trim();
    if (!url) return;

    console.log("Submitting analysis for:", url);

    resultCard.style.display = "block";
    resultLinks.innerHTML = "";
    resultDiv.innerHTML = "<p class='muted'>Running analysis…</p>";

    try {
      console.log("Sending POST request to /analyze");
      const res = await fetch("/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      
      console.log("Response status:", res.status);
      const data = await res.json();
      console.log("Response data:", data);
      
      if (!data.ok) {
        const errorMsg = data.error || "Unknown error";
        const trace = data.trace || "";
        console.error("Analysis failed:", errorMsg);
        if (trace) console.error("Trace:", trace);
        throw new Error(errorMsg);
      }

      const result = data.result;
      console.log("Analysis result:", result);
      
      resultDiv.innerHTML = "";
      resultDiv.appendChild(renderResult(result));

      if (result.permalink) {
        const a1 = el("a", { class: "btn", href: result.permalink }, ["Permalink"]);
        const a2 = el("a", { class: "btn", href: result.permalink + "/json" }, ["JSON"]);
        const a3 = el("a", { class: "btn", href: result.permalink + "/md" }, ["Markdown"]);
        resultLinks.appendChild(a1);
        resultLinks.appendChild(a2);
        resultLinks.appendChild(a3);
      }

    } catch (err) {
      console.error("Error caught:", err);
      resultDiv.innerHTML = `<div class="error"><h3>Error</h3><p>${err.message}</p><p class="muted">Check browser console (F12) for details.</p></div>`;
    }
  });
});
