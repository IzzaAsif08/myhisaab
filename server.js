const express = require('express');
const path = require('path');
const { PDFService, generatePDFHTML } = require('./pdf-generator');

const app = express();
const PORT = process.env.PORT || 5001;


// MongoDB connection (optional)
const MONGODB_URI = process.env.MONGODB_URI;
const pdfService = new PDFService(MONGODB_URI);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize PDF service
pdfService.connect().catch(console.error);

// API Routes
app.get('/api/account-statement/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const statementData = await pdfService.generateStatementData(userId);
    res.json(statementData);
  } catch (error) {
    console.error('Error fetching account statement:', error);
    res.status(500).json({ message: 'Failed to fetch account statement data' });
  }
});

app.get('/api/account-statement/:userId/pdf', async (req, res) => {
  try {
    const userId = req.params.userId;
    const statementData = await pdfService.generateStatementData(userId);
    const htmlContent = generatePDFHTML(statementData);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ message: 'Failed to generate PDF' });
  }
});

// Serve the main statement page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`MyHisaab PDF Generator running on port ${PORT}`);
});

module.exports = app;