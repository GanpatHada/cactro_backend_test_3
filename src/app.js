const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();


app.use(helmet());
app.use(cors());


app.use(express.json({ limit: '50kb' })); // JSON limit
app.use(express.urlencoded({ extended: true, limit: '50kb' })); // URL-encoded data

// Port
const PORT = process.env.PORT || 8000;

// Routes
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Hello app' });
});

// Start server
app.listen(PORT, () => {
  console.log(`App is running on port: ${PORT}`);
});
