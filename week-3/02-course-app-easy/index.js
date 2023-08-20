const express = require('express');
const app = express();

app.use(express.json());

let ADMINS = [];
let USERS = [];
let COURSES = [];

function verifyAdmin(req, res, next) {
  // logic to log in admin
  const { username, password } = req.headers
  if (!username || !password) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  // Check if admin exists and password matches
  const admin = ADMINS.find(admin => admin.username === username && admin.password === password);

  if (!admin) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  
  req.admin = { username: admin.username }
  next()
}

function verifyUser(req, res, next) {
  // logic to log in user
  const { username, password } = req.headers
  if (!username || !password) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  // Check if user exists and password matches
  const user = USERS.find(user => user.username === username && user.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  
  req.user = { username: user.username }
  next()
}

// Admin routes
app.post('/admin/signup', (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  // Check if admin already exists
  if (ADMINS.some(admin => admin.username === username)) {
    return res.status(409).json({ error: 'Username already exists.' });
  }

  const newAdmin = { username, password };
  ADMINS.push(newAdmin);
  res.status(201).json({ message: 'Admin signed up successfully.' });
});

app.post('/admin/login', (req, res) => {
  // logic to log in admin
  const { username, password } = req.headers
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  // Check if admin exists and password matches
  const admin = ADMINS.find(admin => admin.username === username && admin.password === password);

  if (!admin) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  
  // Create a session or token for authenticated admin
  // In a real-world scenario, you would use JWT or a similar mechanism
  // Here, we'll just simulate a successful login
  res.status(200).json({ message: 'Admin logged in successfully.' });
});

app.post('/admin/courses', verifyAdmin, (req, res) => {
  // logic to create a course
  const { title, description, price, imageLink } = req.body;
  if (!title || !description || !price || !imageLink) {
    return res.status(400).json({ error: 'title, description, price and imageLink all fields are required.' });
  }

  const newCourse = {
    id: COURSES.length,
    title,
    description,
    price,
    imageLink,
    published: false,
    author: req.admin.username
  };

  COURSES.push(newCourse);
  res.status(201).json({ message: 'Course created successfully.' });
});

app.put('/admin/courses/:courseId', verifyAdmin, (req, res) => {
  // logic to edit a course
  const courseId = req.params.courseId;
  const course = COURSES.find(course => course.id == courseId);
  
  if (!course) {
    return res.status(404).json({ error: 'Course not found.' });
  }

  const { title, description, price, imageLink } = req.body;
  if (title) course.title = title;
  if (description) course.description = description;
  if (price) course.price = price;
  if (imageLink) course.imageLink = imageLink;

  res.status(200).json({ message: 'Course updated successfully.' });
});

app.put('/admin/courses/:courseId/publish', verifyAdmin, (req, res) => {
  const courseId = req.params.courseId;
  const course = COURSES.find(course => course.id == courseId);

  if (!course) {
    return res.status(404).json({ error: 'Course not found.' });
  }

  course.published = true;
  res.status(200).json({ message: 'Course published successfully.' });
});

app.get('/admin/courses', verifyAdmin, (req, res) => {
  // logic to get all courses
  let adminCourses = COURSES.filter(course => course.author === req.admin.username);
  res.send(adminCourses)
});

// User routes
app.post('/users/signup', (req, res) => {
  // logic to sign up user
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  // Check if user already exists
  if (USERS.some(user => user.username === username)) {
    return res.status(409).json({ error: 'Username already exists.' });
  }

  const newUser = { username, password };
  USERS.push(newUser);
  res.status(201).json({ message: 'User signed up successfully.' });
});

app.post('/users/login', (req, res) => {
  // logic to log in user
  const { username, password } = req.headers
  if (!username || !password) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  // Check if user exists and password matches
  const user = USERS.find(user => user.username === username && user.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  
  // Create a session or token for authenticated admin
  // In a real-world scenario, you would use JWT or a similar mechanism
  // Here, we'll just simulate a successful login
  res.status(200).json({ message: 'User logged in successfully.' });
});

app.get('/users/courses', verifyUser, (req, res) => {
  // logic to list all courses
});

app.post('/users/courses/:courseId', verifyUser, (req, res) => {
  // logic to purchase a course
});

app.get('/users/purchasedCourses', verifyUser, (req, res) => {
  // logic to view purchased courses
});

app.listen(3000, () => {
  console.clear()
  console.log('Server is listening on port https://localhost:3000');
});
