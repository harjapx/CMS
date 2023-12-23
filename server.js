const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
app.use(bodyParser.json());

// Database connection setup
const db = mysql.createConnection({
  host: 'localhost',
  user: 'harjap',
  password: 'harjap',
  database: 'your_new_database',
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Route to serve the admin registration form
app.get('/admin/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin_register.html'));
});

// Route to serve the admin registration form
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin_login.html'));
});

// Route to serve the user login form
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/user-details/:userId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'user_details.html'));
});

app.get('/successfully-updated', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

// Create the admins table if it doesn't exist
db.query(
  `CREATE TABLE IF NOT EXISTS adminsinfo (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL,
      password VARCHAR(255) NOT NULL
    )`,
  (err, result) => {
    if (err) {
      console.error('Error creating admins table:', err);
    } else {
      // console.log('Admins table created or already exists');
    }
  }
);

// Create the user details table if it doesn't exist
db.query(
  `CREATE TABLE IF NOT EXISTS user_details (
    userId INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    kin VARCHAR(255),
    dob TEXT,
    age INT NOT NULL,
    anyIllness TEXT,
    lastResidence TEXT,
    recommendedSource TEXT,
    FOREIGN KEY (userId) REFERENCES users_login(id)
  )`,
  (err, result) => {
    if (err) {
      console.error('Error creating user_details table:', err);
    } else {
      // console.log('user_details table created or already exists');
    }
  }
);

// Route for admin registration
app.post('/admin/register', async (req, res) => {
  const { username, password } = req.body;

  // Hashing the password before storing it in the database
  const hashedPassword = await bcrypt.hash(password, 10);

  // Inserting admin details into the database
  db.query(
    'INSERT INTO adminsinfo (username, password) VALUES (?, ?)',
    [username, hashedPassword],
    (err, result) => {
      if (err) {
        res.status(500).json({ error: 'Failed to register admin' });
      } else {
        res.status(201).json({ message: 'Admin registered successfully' });
      }
    }
  );
});

// Create the users_login table if it doesn't exist
db.query(
  `CREATE TABLE IF NOT EXISTS users_login (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL,
      password VARCHAR(255) NOT NULL
    )`,
  (err, result) => {
    if (err) {
      console.error('Error creating users_login table:', err);
    } else {
      console.log('users_login table created or already exists');
    }
  }
);

// Route for user registration
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  // Hash the password before storing it in the database
  const hashedPassword = await bcrypt.hash(password, 10);

  const insertQuery = 'INSERT INTO users_login (username, password) VALUES (?, ?)';

  db.query(insertQuery, [username, hashedPassword], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Failed to register user' });
    } else {
      res.status(201).json({ message: 'User registered successfully' });
    }
  });
});

// User login endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const selectQuery = 'SELECT * FROM users_login WHERE username = ?';

    db.query(selectQuery, [username], async (err, results) => {
      if (err || results.length === 0) {
        res.status(401).json({ error: 'Invalid credentials' });
      } else {
        const user = results[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (passwordMatch && user) {
          const userDetailsPath = `/user-details/${user.id}`;
          res.json({ userId: user.id, userDetailsPath }); // Sending userId and userDetailsPath upon successful login
        } else {
          res.status(401).json({ error: 'Invalid credentials' });
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});


// Endpoint to update user details after login
app.post('/user-details/:userId', async (req, res) => {
  const userId = req.params.userId;
  const { name, email, age, phone, kin, dob, anyIllness, lastResidence, recommendedSource } = req.body;

  const updateQuery = `INSERT INTO user_details (name, email, age, phone, kin, dob, anyIllness, lastResidence, recommendedSource) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.query(
    updateQuery,
    [name, email, age, phone, kin, dob, anyIllness, lastResidence, recommendedSource],
    (err, result) => {
      if (err) {
        res.status(500).json({ error: 'Failed to update user details' });
      } else {
        res.status(200).json({ message: 'User details updated successfully' });
      }
    }
  );
});

// Get all users listing
app.get('/users', (req, res) => {
  db.query('SELECT * FROM user_details', (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch users' });
    } else {
      res.status(200).json(results);
    }
  });
});

// Route for admin login
app.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;

  // Fetch admin details from the database based on the username
  db.query(
    'SELECT * FROM adminsinfo WHERE username = ?',
    [username],
    async (err, results) => {
      if (err) {
        res.status(500).json({ error: 'Database error' });
      } else {
        if (results.length === 0) {
          res.status(401).json({ error: 'Invalid credentials' });
        } else {
          const admin = results[0];

          // Compare the provided password with the stored hash
          const passwordMatch = await bcrypt.compare(password, admin.password);

          if (passwordMatch) {
            res.status(200).json({ message: 'Login successful' });
          } else {
            res.status(401).json({ error: 'Invalid credentials' });
          }
        }
      }
    }
  );
});

// Ensure to implement proper authentication and authorization for admin operations
app.get('/admin/dashboard', (req, res) => {
  const adminToken = req.headers.authorization;

  // Verify admin token
  jwt.verify(adminToken, 'your_secret_key', (err, decoded) => {

    // Here, you can fetch user data from the database and send it to the admin dashboard
    // Implement necessary logic to fetch user data and render the admin dashboard

    res.sendFile(__dirname + '/public/admin_dashboard.html');
  });
});

// Update user endpoint
app.put('/admin/users/:id', (req, res) => {
  const userId = req.params.id;
  const { email, name } = req.body;

  // Update the user information in the database
  db.query(
    'UPDATE user_details SET email=?, name=? WHERE id=?',
    [email, name, userId],
    (err, result) => {
      if (err) {
        res.status(500).json({ error: 'Failed to update user' });
      } else {
        res.status(200).json({ message: 'User updated successfully' });
      }
    }
  );
});

// Delete user endpoint
app.delete('/admin/users/:id', (req, res) => {
  const userId = req.params.id;

  // Delete the user from the database
  db.query('DELETE FROM user_details WHERE id=?', [userId], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Failed to delete user' });
    } else {
      res.status(200).json({ message: 'User deleted successfully' });
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
