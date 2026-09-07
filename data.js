// ---------------------------------------------------------------------
// data.js — the calendar's data layer.
//
// This is the ONLY file that knows where booking data comes from and
// goes to. Right now it just keeps a seed list in memory (it resets
// every time the page reloads — nothing is actually saved anywhere).
//
// When a real backend + database are ready, this is the one file to
// change. For example:
//
//   async function loadAppointments() {
//     const res = await fetch("/api/appointments");
//     return res.json();
//   }
//
//   async function saveAppointment(appt) {
//     const res = await fetch("/api/appointments", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(appt),
//     });
//     return res.json(); // expect the server to hand back a real id
//   }
//
//   async function updateAppointmentStatus(id, status) {
//     await fetch(`/api/appointments/${id}`, {
//       method: "PATCH",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ status }),
//     });
//   }
//
// app.js only calls the functions below, never touches SEED_APPOINTMENTS
// directly — so swapping these bodies for real network calls is the
// only change needed to go from "demo data" to "a real database".
// ---------------------------------------------------------------------

const SEED_APPOINTMENTS = [
  { id: 1, day: 0, start: 9, end: 10, client: "Marta Ivanenko", status: "confirmed" },
  { id: 2, day: 0, start: 11.5, end: 12.5, client: "Oleh Bondar", status: "pending" },
  { id: 3, day: 1, start: 10, end: 11, client: "Sasha Kovalenko", status: "pending" },
  { id: 4, day: 2, start: 14, end: 15.5, client: "Iryna Melnyk", status: "confirmed" },
  { id: 5, day: 3, start: 9.5, end: 10.5, client: "Petro Sydorenko", status: "declined" },
  { id: 6, day: 3, start: 16, end: 17, client: "Yuliya Tkachenko", status: "pending" },
  { id: 7, day: 4, start: 12, end: 13, client: "Andriy Kravets", status: "confirmed" },
  { id: 8, day: 5, start: 10, end: 11, client: "Kateryna Popova", status: "pending" },
];

let _nextAppointmentId = 100;

// TODO(database): replace with a real fetch() call to your API.
function loadAppointments() {
  return SEED_APPOINTMENTS.map(a => ({ ...a }));
}

// TODO(database): once appointments are created server-side, use the
// id the server returns instead of this local counter.
function nextAppointmentId() {
  return _nextAppointmentId++;
}
