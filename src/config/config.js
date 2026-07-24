export const CONFIG = {
  // RELAY_URL is public by design; secrets and subscribers live securely in the Worker
  RELAY_URL: import.meta.env.VITE_RELAY_URL || 'https://faculty-bot-relay.georgeadelpro.workers.dev',
  BOOK_TITLE: "Le livret de l'étudiant",
  BOOK_AUTHOR: "Ola Yahia Fangary Ali",
  TOTAL_PAGES: 564,
  UNITS: [
    { id: "unit1", title: "Module 1 : L'environnement et le développement durable", lessons: ["lesson1", "lesson2", "lesson3"] },
    { id: "unit2", title: "Module 2 : La technologie et la société", lessons: ["lesson4", "lesson5", "lesson6"] },
    { id: "unit3", title: "Module 3 : Le travail et la vie sociale", lessons: ["lesson7", "lesson8", "lesson9"] },
    { id: "unit4", title: "Module 4 : Le sport et la vie scolaire", lessons: ["lesson10", "lesson11", "lesson12"] }
  ]
};
