import { addDoc, collection } from "firebase/firestore"
import { db } from "./firebase"

const dummyWorkers = [
  { name: "Ali Raza", skill: "Electrician", location: "Lahore", rate: 1800, phone: "03001234567", available: true },
  { name: "Ahmed Khan", skill: "Mason", location: "Karachi", rate: 2200, phone: "03011234567", available: true },
  { name: "Bilal Hussain", skill: "Plumber", location: "Islamabad", rate: 2000, phone: "03021234567", available: false },
  { name: "Usman Tariq", skill: "Painter", location: "Faisalabad", rate: 1500, phone: "03031234567", available: true },
  { name: "Kashif Mehmood", skill: "Carpenter", location: "Rawalpindi", rate: 1900, phone: "03041234567", available: true },
  { name: "Zeeshan Iqbal", skill: "Laborer", location: "Multan", rate: 1200, phone: "03051234567", available: true },
  { name: "Rashid Aslam", skill: "Electrician", location: "Karachi", rate: 2100, phone: "03061234567", available: false },
  { name: "Naveed Akhtar", skill: "Mason", location: "Lahore", rate: 2300, phone: "03071234567", available: true },
  { name: "Imran Sheikh", skill: "Plumber", location: "Faisalabad", rate: 1700, phone: "03081234567", available: true },
  { name: "Tariq Mahmood", skill: "Painter", location: "Peshawar", rate: 1600, phone: "03091234567", available: true }
]

const dummyJobs = [
  { skill: "Electrician", location: "Lahore", pay: 2000, date: "2026-08-05" },
  { skill: "Mason", location: "Karachi", pay: 2500, date: "2026-08-06" },
  { skill: "Plumber", location: "Islamabad", pay: 1900, date: "2026-08-07" },
  { skill: "Painter", location: "Faisalabad", pay: 1600, date: "2026-08-08" },
  { skill: "Carpenter", location: "Rawalpindi", pay: 2100, date: "2026-08-09" },
  { skill: "Laborer", location: "Multan", pay: 1300, date: "2026-08-10" },
  { skill: "Electrician", location: "Quetta", pay: 2200, date: "2026-08-11" },
  { skill: "Mason", location: "Lahore", pay: 2400, date: "2026-08-12" }
]

export async function seedDatabase(currentUserId, currentUserEmail) {
  let count = 0

  for (const worker of dummyWorkers) {
    await addDoc(collection(db, "workers"), {
      ...worker,
      email: `${worker.name.toLowerCase().replace(/\s/g, "")}@example.com`,
      updatedAt: new Date().toISOString()
    })
    count++
  }

  for (const job of dummyJobs) {
    await addDoc(collection(db, "jobs"), {
      ...job,
      employerId: currentUserId || "seed-employer",
      employerEmail: currentUserEmail || "employer@example.com",
      createdAt: new Date().toISOString()
    })
    count++
  }

  return count
}