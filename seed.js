// scripts/seed.js
// Populates the database with realistic demo data: medicines and batches
// with a mix of in-date, expiring-soon, and already-expired stock, so the
// dashboard has something to show immediately after setup.
// Run with: npm run seed
const svc = require('../src/services/pharmacyService');

const today = new Date();
function offsetDate(days) {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const medicines = [
  { name: 'Paracetamol 500mg', manufacturer: 'Cipla', unitPrice: 2.5 },
  { name: 'Amoxicillin 250mg', manufacturer: 'Sun Pharma', unitPrice: 5.0 },
  { name: 'Cough Syrup', manufacturer: 'Dabur', unitPrice: 45.0 },
  { name: 'Ibuprofen 400mg', manufacturer: 'Zydus', unitPrice: 3.2 },
  { name: 'Insulin Glargine', manufacturer: 'Novo Nordisk', unitPrice: 320.0 },
  { name: 'Vitamin C Tablets', manufacturer: 'HealthKart', unitPrice: 8.0 },
  { name: 'Cetirizine 10mg', manufacturer: 'Cipla', unitPrice: 1.5 },
];

const batches = [
  ['PARA-B101', 'Paracetamol 500mg', 200, -400, -80],  // already expired
  ['PARA-B102', 'Paracetamol 500mg', 150, -60, 240],
  ['PARA-B103', 'Paracetamol 500mg', 80, -20, 20],       // expiring soon
  ['AMOX-B201', 'Amoxicillin 250mg', 60, -300, -30],     // expired
  ['AMOX-B202', 'Amoxicillin 250mg', 120, -30, 180],
  ['COUGH-B301', 'Cough Syrup', 40, -200, 10],           // expiring soon
  ['COUGH-B302', 'Cough Syrup', 25, -20, 150],
  ['IBU-B401', 'Ibuprofen 400mg', 90, -400, -200],       // expired
  ['IBU-B402', 'Ibuprofen 400mg', 110, -30, 400],
  ['INSU-B501', 'Insulin Glargine', 15, -60, 18],        // expiring soon
  ['INSU-B502', 'Insulin Glargine', 30, -20, 400],
  ['VITC-B601', 'Vitamin C Tablets', 300, -60, 8],       // expiring very soon
  ['CETI-B701', 'Cetirizine 10mg', 500, -300, -100],     // expired
];

for (const m of medicines) svc.addMedicine(m);

for (const [batchId, medicineName, quantity, mfgOffset, expOffset] of batches) {
  try {
    svc.addBatch({
      medicineName, batchId, quantity,
      mfgDate: offsetDate(mfgOffset),
      expiryDate: offsetDate(expOffset),
    });
  } catch (e) {
    console.log(`Skipped ${batchId}: ${e.message}`);
  }
}

console.log(`Seeded ${medicines.length} medicines and ${batches.length} batches.`);
