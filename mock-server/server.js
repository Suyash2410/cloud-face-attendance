const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// In-memory mock store
let students = [
  { studentId: 'TE-A-01', name: 'Aarav Sharma', email: 'aarav.sharma@engg.edu', division: 'TE-A', year: 3, enrollmentState: 'enrolled', faceIds: ['face-1'] },
  { studentId: 'TE-A-02', name: 'Ananya Patel', email: 'ananya.patel@engg.edu', division: 'TE-A', year: 3, enrollmentState: 'enrolled', faceIds: ['face-2'] },
  { studentId: 'TE-C-01', name: 'Tanvi Choudhury', email: 'tanvi.c@engg.edu', division: 'TE-C', year: 3, enrollmentState: 'enrolled', faceIds: ['face-3'] }
];

let settings = {
  matchThreshold: 90,
  reviewThreshold: 80,
  shortageThreshold: 75,
  editWindowHours: 24,
  photoRetentionDays: 30,
  collegeName: 'Veermata Jijabai Technological Institute (VJTI)'
};

// Routes matching AWS API Gateway contract
app.get('/health', (req, res) => res.json({ status: 'ok', mode: 'mock' }));
app.get('/me', (req, res) => res.json({ userId: 'adm-1', role: 'admin', name: 'Dr. Hemant Bhargava', email: 'admin@haazri.edu' }));
app.get('/students', (req, res) => res.json(students));
app.post('/students', (req, res) => {
  students.push(req.body);
  res.status(201).json(req.body);
});
app.get('/settings', (req, res) => res.json(settings));
app.put('/settings', (req, res) => {
  settings = { ...settings, ...req.body };
  res.json(settings);
});

app.listen(PORT, () => {
  console.log(`[Haazri Mock Server] Running at http://localhost:${PORT}`);
});
