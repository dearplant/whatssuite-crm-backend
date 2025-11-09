/**
 * Razorpay Sandbox Data Seeder (Full + Payments)
 * ----------------------------------------------
 * Generates:
 *  - Products (items)
 *  - Orders
 *  - Payments (simulated)
 *  - Invoices
 *  - Plans + Subscriptions
 * With:
 *  - Auto retry on rate limit
 *  - Unique receipts
 *  - Throttling + safety delays
 */

import axios from "axios";

// 🔐 Razorpay Test Keys
const RAZORPAY_KEY_ID = "rzp_test_RdFzWxSWV4RJcE";
const RAZORPAY_KEY_SECRET = "h25Wn9qnDz6omNeZFtbVvTz6";

const razorpay = axios.create({
  baseURL: "https://api.razorpay.com/v1",
  auth: { username: RAZORPAY_KEY_ID, password: RAZORPAY_KEY_SECRET },
  headers: { "Content-Type": "application/json" },
});

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function safeApiCall(apiFn, retries = 5, delay = 2000) {
  try {
    return await apiFn();
  } catch (err) {
    const res = err.response?.data;
    const status = err.response?.status;

    if (status === 429 || res?.error?.description?.includes("Too many requests")) {
      if (retries > 0) {
        console.warn(`⚠️ Rate limited. Retrying in ${delay / 1000}s...`);
        await sleep(delay);
        return safeApiCall(apiFn, retries - 1, delay * 2);
      }
      throw new Error("❌ Max retries exceeded (rate limit)");
    }

    if (retries > 0 && !status) {
      console.warn(`⚠️ Network issue. Retrying in ${delay / 1000}s...`);
      await sleep(delay);
      return safeApiCall(apiFn, retries - 1, delay * 2);
    }

    console.error("❌ Request failed:", res || err.message);
    return null;
  }
}

// STEP 1 — Products
async function createProducts(count = 20) {
  console.log(`\n🧩 Creating ${count} Products...`);
  const list = [];

  for (let i = 1; i <= count; i++) {
    const data = {
      name: `Product ${i}`,
      description: `Auto test product ${i}`,
      amount: rand(5000, 99900),
      currency: "INR",
      type: "invoice",
    };

    const res = await safeApiCall(() => razorpay.post("/items", data));
    if (res?.data) {
      list.push(res.data);
      console.log(`✅ Product: ${res.data.name}`);
    }
    await sleep(800);
  }
  return list;
}

// STEP 2 — Orders
async function createOrders(products, count = 100) {
  console.log(`\n📦 Creating ${count} Orders...`);
  const orders = [];

  for (let i = 1; i <= count; i++) {
    const p = products[rand(0, products.length - 1)];
    const data = {
      amount: p.amount,
      currency: "INR",
      receipt: `rcpt_${String(i).padStart(3, "0")}_${Date.now()}`,
      notes: { product_name: p.name, purpose: "Test Order" },
    };

    const res = await safeApiCall(() => razorpay.post("/orders", data));
    if (res?.data) {
      orders.push(res.data);
      console.log(`✅ Order ${i}: ${res.data.id}`);
    }
    await sleep(800);
  }
  return orders;
}

// STEP 3 — Payments (simulate)
async function createPayments(orders, count = 50) {
  console.log(`\n💳 Simulating ${count} Payments...`);
  const payments = [];

  for (let i = 1; i <= count; i++) {
    const o = orders[rand(0, orders.length - 1)];

    const data = {
      amount: o.amount,
      currency: "INR",
      email: `payer${i}@example.com`,
      contact: `99999${rand(10000, 99999)}`,
      order_id: o.id,
      method: "card",
      card: {
        number: "4111111111111111",
        expiry_month: 12,
        expiry_year: 2030,
        cvv: "123",
        name: `Payer ${i}`,
      },
    };

    const res = await safeApiCall(() => razorpay.post("/payments", data));
    if (res?.data) {
      payments.push(res.data);
      console.log(`✅ Payment ${i}: ${res.data.id} (${res.data.status})`);
    }
    await sleep(1200);
  }
  return payments;
}

// STEP 4 — Invoices
async function createInvoices(products, orders, payments, count = 50) {
  console.log(`\n🧾 Creating ${count} Invoices...`);
  const invoices = [];

  for (let i = 1; i <= count; i++) {
    const p = products[rand(0, products.length - 1)];
    const o = orders[rand(0, orders.length - 1)];
    const pay = payments[rand(0, payments.length - 1)];

    const data = {
      type: "invoice",
      customer: {
        name: `Customer ${i}`,
        email: `customer${i}@example.com`,
        contact: `99999${rand(10000, 99999)}`,
      },
      line_items: [
        {
          name: p.name,
          description: p.description,
          amount: p.amount,
          currency: "INR",
          quantity: rand(1, 2),
        },
      ],
      currency: "INR",
      description: `Invoice for ${o.id} and ${pay?.id || "no-payment"}`,
      receipt: `INV-${String(i).padStart(3, "0")}-${Date.now()}`,
      notes: { order_id: o.id, payment_id: pay?.id, product_id: p.id },
    };

    const res = await safeApiCall(() => razorpay.post("/invoices", data));
    if (res?.data) {
      invoices.push(res.data);
      console.log(`✅ Invoice ${i}: ${res.data.id}`);
    }

    await sleep(1300);
  }
  return invoices;
}

// STEP 5 — Plans + Subscriptions
async function createPlansAndSubscriptions(count = 5) {
  console.log(`\n🧾 Creating ${count} Plans & Subscriptions...`);
  for (let i = 1; i <= count; i++) {
    const plan = {
      period: "monthly",
      interval: 1,
      item: {
        name: `Plan ${i}`,
        amount: rand(19900, 99900),
        currency: "INR",
        description: `Test Plan ${i}`,
      },
    };

    const planRes = await safeApiCall(() => razorpay.post("/plans", plan));
    if (!planRes?.data) continue;

    console.log(`✅ Plan ${i}: ${planRes.data.id}`);

    const sub = {
      plan_id: planRes.data.id,
      total_count: rand(3, 12),
      customer_notify: 1,
    };

    const subRes = await safeApiCall(() => razorpay.post("/subscriptions", sub));
    if (subRes?.data) console.log(`  ↳ Subscription ${subRes.data.id}`);

    await sleep(1500);
  }
}

// MAIN
(async () => {
  console.log("🚀 Starting Full Razorpay Seeder (with payments)...");

  const products = await createProducts(20);
  const orders = await createOrders(products, 100);
  const payments = await createPayments(orders, 50);
  const invoices = await createInvoices(products, orders, payments, 50);
  await createPlansAndSubscriptions(5);

  console.log("\n✅ Done!");
  console.log(`Products: ${products.length}, Orders: ${orders.length}, Payments: ${payments.length}, Invoices: ${invoices.length}`);
})();