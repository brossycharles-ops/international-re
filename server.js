const express = require('express');
const bodyParser = require('body-parser');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const EXCEL_FILE = path.join(__dirname, 'newsletter_subscribers.xlsx');

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Excel file if it doesn't exist
function initExcel() {
  if (!fs.existsSync(EXCEL_FILE)) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([['First Name', 'Last Name', 'Email', 'Date Subscribed']]);
    // Style the header row width
    ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 35 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Subscribers');
    XLSX.writeFile(wb, EXCEL_FILE);
    console.log('Created newsletter_subscribers.xlsx');
  }
}

// Subscribe endpoint
app.post('/api/subscribe', (req, res) => {
  const { firstName, lastName, email } = req.body;

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  try {
    const wb = XLSX.readFile(EXCEL_FILE);
    const ws = wb.Sheets['Subscribers'];
    const data = XLSX.utils.sheet_to_json(ws);

    // Check for duplicate email
    const duplicate = data.find(row => row['Email'] && row['Email'].toLowerCase() === email.toLowerCase());
    if (duplicate) {
      return res.status(409).json({ error: 'This email is already subscribed.' });
    }

    // Add new subscriber
    const newRow = {
      'First Name': firstName.trim(),
      'Last Name': lastName.trim(),
      'Email': email.trim().toLowerCase(),
      'Date Subscribed': new Date().toISOString().split('T')[0]
    };
    data.push(newRow);

    const newWs = XLSX.utils.json_to_sheet(data);
    newWs['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 35 }, { wch: 22 }];
    wb.Sheets['Subscribers'] = newWs;
    XLSX.writeFile(wb, EXCEL_FILE);

    console.log(`New subscriber: ${firstName} ${lastName} <${email}>`);
    res.json({ message: 'Successfully subscribed!' });
  } catch (err) {
    console.error('Error saving subscriber:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// Start server
initExcel();
app.listen(PORT, () => {
  console.log(`\n  International RE is running at http://localhost:${PORT}\n`);
});
