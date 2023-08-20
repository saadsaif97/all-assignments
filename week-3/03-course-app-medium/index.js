const express = require('express');
const jwt = require("jsonwebtoken");
const app = express();
const fs = require('fs/promises');

// loading environment variables
require('dotenv').config()

app.use(express.json());

let ADMINS = [];
let USERS = [];
let COURSES = [];

async function getAdmins() {
  try {
    const data = await fs.readFile('admins.json', 'utf-8');
    return JSON.parse(data)
  } catch (error) {
    console.log({error})
  }
}

async function getUsers() {
  try {
    const data = await fs.readFile('users.json', 'utf-8');
    return JSON.parse(data)
  } catch (error) {
    console.log({error})
  }
}

async function getCourses() {
  try {
    const data = await fs.readFile('courses.json', 'utf-8');
    return JSON.parse(data)
  } catch (error) {
    console.log({error})
  }
}

const ADMIN_SECRET = process.env.ADMIN_SECRET;
const USER_SECRET = process.env.USER_SECRET;

function verifyAdmin(req, res, next) {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).json({
            message: 'No Authorization Header'
        })
    }
    try {
        const token = authorization.split('Bearer ')[1];
        if (!token) {
            return res.status(401).json({
                message: 'Invalid Token Format'
            })
        }
        const decode = jwt.verify(token, ADMIN_SECRET);
        req.admin = decode
        next()
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({
                message: 'Session Expired',
                error: error.message,
            })
        }
        if (error instanceof jwt.JsonWebTokenError || error instanceof TokenError) {
            return res.status(401).json({
                message: 'Invalid Token',
                error: error.message,
            })
        }
        res.status(500).json({
            message: 'Internal server Error',
            error: error.message,
            stack: error.stack
        });
    }
}

function verifyUser(req, res, next) {
  const authorization = req.headers.authorization;
  if (!authorization) {
      return res.status(401).json({
          message: 'No Authorization Header'
      })
  }
  try {
      const token = authorization.split('Bearer ')[1];
      if (!token) {
          return res.status(401).json({
              message: 'Invalid Token Format'
          })
      }
      const decode = jwt.verify(token, USER_SECRET);
      req.user = decode
      next()
  } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
          return res.status(401).json({
              message: 'Session Expired',
              error: error.message,
          })
      }
      if (error instanceof jwt.JsonWebTokenError || error instanceof TokenError) {
          return res.status(401).json({
              message: 'Invalid Token',
              error: error.message,
          })
      }
      res.status(500).json({
          message: 'Internal server Error',
          error: error.message,
          stack: error.stack
      });
  }
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
  
  // Generate a JWT token with a 1-hour expiration time
  const token = jwt.sign({ username: username }, ADMIN_SECRET, { expiresIn: '1h' });
  res.status(201).json({ message: 'Admin signed up successfully.', token });
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
  const courseId = parseInt(req.params.courseId);
  const course = COURSES.find(course => course.id === courseId);
  
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
  const courseId = parseInt(req.params.courseId);
  const course = COURSES.find(course => course.id === courseId);

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

  const newUser = { username, password, courses: [] };
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
  
  // Generate a JWT token with a 1-hour expiration time
  const token = jwt.sign({ username: username }, USER_SECRET, { expiresIn: '1h' });
  res.status(201).json({ message: 'Admin signed up successfully.', token });
});

app.get('/users/courses', verifyUser, (req, res) => {
  // logic to list all courses
  res.send(COURSES)
});

app.post('/users/courses/:courseId', verifyUser, (req, res) => {
  const courseId = parseInt(req.params.courseId)
  const currentUser = USERS.find(user => user.username == req.user.username)
  const currentCourses = currentUser.courses
  // logic to purchase a course
  let alreadyPurchased = currentCourses.includes(courseId);
  if (alreadyPurchased) return res.status(400).send({error: "Already purchased"})
  
  const user = USERS.find(user => user.username === req.user.username);
  user.courses.push(courseId)
  return res.send({message: "Course purchased successfully"})
});

app.get('/users/purchasedCourses', verifyUser, (req, res) => {
  const currentUser = USERS.find(user => user.username == req.user.username)
  const currentCourses = currentUser.courses
  // logic to view purchased courses
  let userCourses = COURSES.filter(course => currentCourses.includes(course.id));
  res.send(userCourses)
});

app.listen(3000, async () => {
  console.clear()
  let admins = await getAdmins()
  let users = await getUsers()
  let courses = await getCourses()
  console.log({admins, users, courses})
  console.log('Server is listening on port https://localhost:3000');
});
